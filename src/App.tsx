import React, { useState, useEffect, useMemo } from 'react';
import { Inquiry, Enrollment } from './types.ts';

export default function App() {
  // Active Section: 'inquiries' | 'enrollments'
  const [activeSection, setActiveSection] = useState<'inquiries' | 'enrollments'>('inquiries');

  // Data states
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [dealtFilter, setDealtFilter] = useState<'all' | 'pending' | 'dealt'>('all');

  // Sorting
  const [sortCol, setSortCol] = useState<number>(5); // default date received
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Responsive View Mode: Table vs Card View
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 992) {
      return 'cards';
    }
    return 'table';
  });

  // UI Alerts
  const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'danger' | 'info'; text: string } | null>(null);

  // Custom non-blocking confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Modals
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testModalTab, setTestModalTab] = useState<'inquiry' | 'enrollment'>('inquiry');
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptModalTab, setScriptModalTab] = useState<'inquiry' | 'enrollment'>('inquiry');

  // Test Inquiry Form state (5 core fields requested by user)
  const [testInqName, setTestInqName] = useState('David Miller');
  const [testInqPhone, setTestInqPhone] = useState('+1 (555) 234-8901');
  const [testInqEmail, setTestInqEmail] = useState('david.miller@example.com');
  const [testInqHelpWith, setTestInqHelpWith] = useState('Schedule a Campus Tour');
  const [testInqMessage, setTestInqMessage] = useState('We are relocating to the neighborhood and would love to visit the daycare classrooms next Tuesday.');
  const [testInqSending, setTestInqSending] = useState(false);

  // Test Enrollment Form state (/enroll & /enool)
  const [testEnrParent, setTestEnrParent] = useState('Sarah & David Miller');
  const [testEnrPhone, setTestEnrPhone] = useState('+1 (555) 234-8901');
  const [testEnrEmail, setTestEnrEmail] = useState('sarah.miller@example.com');
  const [testEnrChild, setTestEnrChild] = useState('Oliver Miller');
  const [testEnrAge, setTestEnrAge] = useState('2.5 years');
  const [testEnrProgram, setTestEnrProgram] = useState('Toddler Program (Full-Day)');
  const [testEnrDate, setTestEnrDate] = useState('2026-11-01');
  const [testEnrNotes, setTestEnrNotes] = useState('Looking for full-time enrollment. No dietary restrictions.');
  const [testEnrEndpoint, setTestEnrEndpoint] = useState<'/enroll' | '/enool'>('/enroll');
  const [testEnrSending, setTestEnrSending] = useState(false);

  // Auto-dismiss flash notifications after 4.5 seconds
  useEffect(() => {
    if (flashMessage) {
      const timer = setTimeout(() => {
        setFlashMessage(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [flashMessage]);

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      setLastUpdated(new Date().toISOString().slice(0, 19).replace('T', ' '));
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all data
  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [resInq, resEnr] = await Promise.all([
        fetch('/api/inquiries'),
        fetch('/api/enrollments')
      ]);

      if (resInq.ok) {
        const dataInq = await resInq.json();
        setInquiries(dataInq.inquiries || dataInq.tickets || []);
      }
      if (resEnr.ok) {
        const dataEnr = await resEnr.json();
        setEnrollments(dataEnr.enrollments || []);
      }
      setLastUpdated(new Date().toISOString().slice(0, 19).replace('T', ' '));
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // SSE connection for live updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/inquiries/stream');

      // Inquiry events
      eventSource.addEventListener('inquiry_created', (event) => {
        try {
          const item: Inquiry = JSON.parse(event.data);
          setInquiries(prev => {
            if (prev.some(i => i.id === item.id || i.ticket_number === item.ticket_number)) return prev;
            return [item, ...prev];
          });
          setFlashMessage({
            type: 'info',
            text: `New Inquiry from ${item.your_name} (${item.what_can_we_help_with})`
          });
        } catch (e) {
          console.error(e);
        }
      });

      eventSource.addEventListener('inquiry_updated', (event) => {
        try {
          const updated: Inquiry = JSON.parse(event.data);
          setInquiries(prev => prev.map(i => (i.id === updated.id || i.ticket_number === updated.ticket_number ? updated : i)));
          setSelectedInquiry(prev => (prev?.id === updated.id || prev?.ticket_number === updated.ticket_number ? updated : prev));
        } catch (e) {
          console.error(e);
        }
      });

      eventSource.addEventListener('inquiry_deleted', (event) => {
        try {
          const { id, ticket_number } = JSON.parse(event.data);
          const target = (id || ticket_number || '').toLowerCase();
          setInquiries(prev => prev.filter(i => (i.id || '').toLowerCase() !== target && (i.ticket_number || '').toLowerCase() !== target));
        } catch (e) {
          console.error(e);
        }
      });

      // Enrollment events
      eventSource.addEventListener('enrollment_created', (event) => {
        try {
          const item: Enrollment = JSON.parse(event.data);
          setEnrollments(prev => {
            if (prev.some(e => e.id === item.id || e.enrollment_number === item.enrollment_number)) return prev;
            return [item, ...prev];
          });
          setFlashMessage({
            type: 'success',
            text: `New Enrollment: ${item.parent_name} • Child: ${item.child_name || 'N/A'}`
          });
        } catch (e) {
          console.error(e);
        }
      });

      eventSource.addEventListener('enrollment_updated', (event) => {
        try {
          const updated: Enrollment = JSON.parse(event.data);
          setEnrollments(prev => prev.map(e => (e.id === updated.id || e.enrollment_number === updated.enrollment_number ? updated : e)));
          setSelectedEnrollment(prev => (prev?.id === updated.id || prev?.enrollment_number === updated.enrollment_number ? updated : prev));
        } catch (e) {
          console.error(e);
        }
      });

      eventSource.addEventListener('enrollment_deleted', (event) => {
        try {
          const { id, enrollment_number } = JSON.parse(event.data);
          const target = (id || enrollment_number || '').toLowerCase();
          setEnrollments(prev => prev.filter(e => (e.id || '').toLowerCase() !== target && (e.enrollment_number || '').toLowerCase() !== target));
        } catch (e) {
          console.error(e);
        }
      });

      eventSource.addEventListener('data_cleared', () => {
        setInquiries([]);
        setEnrollments([]);
      });
    } catch (err) {
      console.error(err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // Toggle Tick / Dealt for Inquiry
  const handleToggleInquiryDealt = async (id: string, newDealtStatus: boolean) => {
    setInquiries(prev => prev.map(i => {
      if (i.id === id || i.ticket_number === id) {
        return { ...i, dealt: newDealtStatus, status: newDealtStatus ? 'Resolved' : 'Pending' };
      }
      return i;
    }));

    if (selectedInquiry && (selectedInquiry.id === id || selectedInquiry.ticket_number === id)) {
      setSelectedInquiry(prev => prev ? { ...prev, dealt: newDealtStatus, status: newDealtStatus ? 'Resolved' : 'Pending' } : null);
    }

    try {
      await fetch(`/api/inquiries/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealt: newDealtStatus })
      });
      setFlashMessage({
        type: newDealtStatus ? 'success' : 'info',
        text: newDealtStatus ? 'Inquiry marked as Dealt ✓' : 'Inquiry marked as Pending'
      });
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  // Toggle Tick / Dealt for Enrollment
  const handleToggleEnrollmentDealt = async (id: string, newDealtStatus: boolean) => {
    setEnrollments(prev => prev.map(e => {
      if (e.id === id || e.enrollment_number === id) {
        return { ...e, dealt: newDealtStatus, status: newDealtStatus ? 'Confirmed' : 'Pending' };
      }
      return e;
    }));

    if (selectedEnrollment && (selectedEnrollment.id === id || selectedEnrollment.enrollment_number === id)) {
      setSelectedEnrollment(prev => prev ? { ...prev, dealt: newDealtStatus, status: newDealtStatus ? 'Confirmed' : 'Pending' } : null);
    }

    try {
      await fetch(`/api/enrollments/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealt: newDealtStatus })
      });
      setFlashMessage({
        type: newDealtStatus ? 'success' : 'info',
        text: newDealtStatus ? 'Enrollment confirmed / processed ✓' : 'Enrollment set to Pending'
      });
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  // Delete Inquiry
  const requestDeleteInquiry = (inq: Inquiry) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Inquiry',
      message: `Are you sure you want to permanently delete inquiry from "${inq.your_name}" (${inq.ticket_number})?`,
      confirmLabel: 'Yes, Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setInquiries(prev => prev.filter(i => i.id !== inq.id && i.ticket_number !== inq.ticket_number));
        if (selectedInquiry?.id === inq.id) setSelectedInquiry(null);

        setFlashMessage({
          type: 'success',
          text: `Inquiry for ${inq.your_name} deleted successfully.`
        });

        try {
          const target = encodeURIComponent(inq.id || inq.ticket_number);
          await fetch(`/api/inquiries/${target}`, { method: 'DELETE' });
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Delete Enrollment
  const requestDeleteEnrollment = (enr: Enrollment) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Enrollment Record',
      message: `Are you sure you want to permanently delete enrollment registration for "${enr.parent_name}" (${enr.enrollment_number})?`,
      confirmLabel: 'Yes, Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setEnrollments(prev => prev.filter(e => e.id !== enr.id && e.enrollment_number !== enr.enrollment_number));
        if (selectedEnrollment?.id === enr.id) setSelectedEnrollment(null);

        setFlashMessage({
          type: 'success',
          text: `Enrollment for ${enr.parent_name} deleted successfully.`
        });

        try {
          const target = encodeURIComponent(enr.id || enr.enrollment_number);
          await fetch(`/api/enrollments/${target}`, { method: 'DELETE' });
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Reset all to 0
  const requestResetAll = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reset All Records to 0',
      message: 'Are you sure you want to permanently delete all inquiries and enrollments? All counters will return to 0.',
      confirmLabel: 'Yes, Reset Everything to 0',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setInquiries([]);
        setEnrollments([]);
        setSelectedInquiry(null);
        setSelectedEnrollment(null);
        setFlashMessage({
          type: 'success',
          text: 'All inquiries and enrollments reset to 0.'
        });

        try {
          await fetch('/api/inquiries/clear_all', { method: 'POST' });
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Submit Test Inquiry (/inquiry endpoint with the 5 parameters)
  const handleSendTestInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestInqSending(true);

    try {
      const query = new URLSearchParams({
        'Your name': testInqName,
        'Phone number': testInqPhone,
        'Email address': testInqEmail,
        'What can we help with?': testInqHelpWith,
        'Your message': testInqMessage
      });

      const res = await fetch(`/inquiry?${query.toString()}`, {
        method: 'GET'
      });

      if (res.ok) {
        setShowTestModal(false);
        setActiveSection('inquiries');
        setFlashMessage({
          type: 'success',
          text: `Test inquiry received from ${testInqName} via /inquiry!`
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
      setFlashMessage({
        type: 'danger',
        text: 'Failed to send test inquiry.'
      });
    } finally {
      setTestInqSending(false);
    }
  };

  // Submit Test Enrollment (/enroll or /enool endpoint)
  const handleSendTestEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestEnrSending(true);

    try {
      const query = new URLSearchParams({
        parent_name: testEnrParent,
        phone: testEnrPhone,
        email: testEnrEmail,
        child_name: testEnrChild,
        child_age: testEnrAge,
        preferred_program: testEnrProgram,
        preferred_start_date: testEnrDate,
        message: testEnrNotes
      });

      const res = await fetch(`${testEnrEndpoint}?${query.toString()}`, {
        method: 'GET'
      });

      if (res.ok) {
        setShowTestModal(false);
        setActiveSection('enrollments');
        setFlashMessage({
          type: 'success',
          text: `Test enrollment received for ${testEnrChild} via ${testEnrEndpoint}!`
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
      setFlashMessage({
        type: 'danger',
        text: 'Failed to send test enrollment.'
      });
    } finally {
      setTestEnrSending(false);
    }
  };

  // Filtered Inquiries
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      if (dealtFilter === 'pending' && inq.dealt) return false;
      if (dealtFilter === 'dealt' && !inq.dealt) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          (inq.your_name || '').toLowerCase().includes(q) ||
          (inq.phone || '').toLowerCase().includes(q) ||
          (inq.email || '').toLowerCase().includes(q) ||
          (inq.what_can_we_help_with || '').toLowerCase().includes(q) ||
          (inq.your_message || '').toLowerCase().includes(q) ||
          (inq.ticket_number || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      if (filterCategory && inq.what_can_we_help_with !== filterCategory) {
        return false;
      }

      return true;
    });
  }, [inquiries, searchQuery, filterCategory, dealtFilter]);

  // Sorted Inquiries
  const sortedInquiries = useMemo(() => {
    return [...filteredInquiries].sort((a, b) => {
      let valA = '';
      let valB = '';
      switch (sortCol) {
        case 0: valA = a.dealt ? '1' : '0'; valB = b.dealt ? '1' : '0'; break;
        case 1: valA = a.your_name || ''; valB = b.your_name || ''; break;
        case 2: valA = a.phone || ''; valB = b.phone || ''; break;
        case 3: valA = a.email || ''; valB = b.email || ''; break;
        case 4: valA = a.what_can_we_help_with || ''; valB = b.what_can_we_help_with || ''; break;
        case 5: valA = a.timestamp || a.createdAt || ''; valB = b.timestamp || b.createdAt || ''; break;
        default: return 0;
      }
      const cmp = valA.localeCompare(valB);
      return sortAsc ? cmp : -cmp;
    });
  }, [filteredInquiries, sortCol, sortAsc]);

  // Filtered Enrollments
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((enr) => {
      if (dealtFilter === 'pending' && enr.dealt) return false;
      if (dealtFilter === 'dealt' && !enr.dealt) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          (enr.parent_name || '').toLowerCase().includes(q) ||
          (enr.child_name || '').toLowerCase().includes(q) ||
          (enr.child_age || '').toLowerCase().includes(q) ||
          (enr.phone || '').toLowerCase().includes(q) ||
          (enr.email || '').toLowerCase().includes(q) ||
          (enr.preferred_program || '').toLowerCase().includes(q) ||
          (enr.preferred_start_date || '').toLowerCase().includes(q) ||
          (enr.message || '').toLowerCase().includes(q) ||
          (enr.enrollment_number || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      if (filterCategory && enr.preferred_program !== filterCategory) {
        return false;
      }

      return true;
    });
  }, [enrollments, searchQuery, filterCategory, dealtFilter]);

  // Sorted Enrollments
  const sortedEnrollments = useMemo(() => {
    return [...filteredEnrollments].sort((a, b) => {
      let valA = '';
      let valB = '';
      switch (sortCol) {
        case 0: valA = a.dealt ? '1' : '0'; valB = b.dealt ? '1' : '0'; break;
        case 1: valA = a.parent_name || ''; valB = b.parent_name || ''; break;
        case 2: valA = a.child_name || ''; valB = b.child_name || ''; break;
        case 3: valA = a.phone || ''; valB = b.phone || ''; break;
        case 4: valA = a.email || ''; valB = b.email || ''; break;
        case 5: valA = a.preferred_program || ''; valB = b.preferred_program || ''; break;
        case 6: valA = a.preferred_start_date || ''; valB = b.preferred_start_date || ''; break;
        case 7: valA = a.timestamp || a.createdAt || ''; valB = b.timestamp || b.createdAt || ''; break;
        default: return 0;
      }
      const cmp = valA.localeCompare(valB);
      return sortAsc ? cmp : -cmp;
    });
  }, [filteredEnrollments, sortCol, sortAsc]);

  const handleSort = (colIdx: number) => {
    if (sortCol === colIdx) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(colIdx);
      setSortAsc(true);
    }
  };

  // Distinct category choices for filter dropdown
  const inquiryCategories = useMemo(() => {
    return Array.from(new Set(inquiries.map(i => i.what_can_we_help_with).filter(Boolean))).sort();
  }, [inquiries]);

  const enrollmentPrograms = useMemo(() => {
    return Array.from(new Set(enrollments.map(e => e.preferred_program).filter(Boolean))).sort();
  }, [enrollments]);

  // Stats calculation
  const inqPending = useMemo(() => inquiries.filter(i => !i.dealt).length, [inquiries]);
  const inqDealt = useMemo(() => inquiries.filter(i => i.dealt).length, [inquiries]);
  const enrPending = useMemo(() => enrollments.filter(e => !e.dealt).length, [enrollments]);
  const enrDealt = useMemo(() => enrollments.filter(e => e.dealt).length, [enrollments]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <nav className="navbar navbar-expand-lg">
        <div className="container-fluid px-3 px-md-4">
          <a className="navbar-brand d-flex align-items-center gap-2" href="/">
            <i className="fas fa-shapes text-primary fs-5"></i>
            <span className="fw-bold">Daycare Admin Portal</span>
          </a>
          
          <div className="navbar-nav ms-auto d-flex flex-row gap-2 align-items-center">
            <button
              onClick={() => setShowScriptModal(true)}
              className="btn btn-outline-secondary btn-sm"
              style={{ fontSize: '13px' }}
              title="View Website Form Code"
            >
              <i className="fas fa-code me-1"></i>
              Website Code
            </button>
            <button
              onClick={() => setShowTestModal(true)}
              className="btn btn-primary btn-sm"
              style={{ fontSize: '13px' }}
            >
              <i className="fas fa-paper-plane me-1"></i>
              Submit Test Form
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="container-fluid px-3 px-md-4 mt-4" style={{ maxWidth: '1440px', flex: '1 0 auto' }}>
        
        {/* Flash Message Alert */}
        {flashMessage && (
          <div
            className={`alert alert-${flashMessage.type} alert-dismissible fade show shadow-sm`}
            role="alert"
          >
            <i className={`fas ${flashMessage.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'} me-2`}></i>
            {flashMessage.text}
            <button
              type="button"
              className="btn-close"
              onClick={() => setFlashMessage(null)}
            ></button>
          </div>
        )}

        {/* Top Header & Reset Button */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {activeSection === 'inquiries' ? (
                <>
                  <i className="fas fa-envelope-open-text text-primary me-2"></i>
                  General Inquiries
                </>
              ) : (
                <>
                  <i className="fas fa-user-graduate text-success me-2"></i>
                  Daycare Enrollments
                </>
              )}
            </h1>
            <p className="text-secondary small mb-0">
              {activeSection === 'inquiries' 
                ? 'Incoming messages received via the /inquiry endpoint' 
                : 'Full daycare registrations received via the /enroll (or /enool) endpoint'}
            </p>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button 
              className="btn btn-outline-secondary btn-sm" 
              onClick={fetchData}
              disabled={isRefreshing}
            >
              <i className={`fas fa-sync-alt ${isRefreshing ? 'fa-spin' : ''} me-1`}></i>
              Refresh
            </button>

            {/* Export active section */}
            {(activeSection === 'inquiries' ? inquiries.length > 0 : enrollments.length > 0) && (
              <a 
                href={activeSection === 'inquiries' ? '/export_inquiries' : '/export_enrollments'} 
                className="btn btn-outline-primary btn-sm"
              >
                <i className="fas fa-file-excel me-1"></i>
                Export {activeSection === 'inquiries' ? 'Inquiries' : 'Enrollments'} CSV
              </a>
            )}

            {(inquiries.length > 0 || enrollments.length > 0) && (
              <button 
                className="btn btn-outline-danger btn-sm" 
                onClick={requestResetAll}
                title="Reset all records to 0"
              >
                <i className="fas fa-trash-alt me-1"></i>
                Reset All to 0
              </button>
            )}
          </div>
        </div>

        {/* SECTION NAV TABS (Inquiries vs Enrollments) */}
        <div className="d-flex border-bottom mb-4 gap-2 flex-wrap">
          <button
            type="button"
            className={`btn pb-2 pt-2 px-3 fw-bold rounded-top-2 border-bottom-0 ${
              activeSection === 'inquiries'
                ? 'btn-light border text-primary shadow-xs'
                : 'btn-link text-secondary text-decoration-none'
            }`}
            style={{ fontSize: '15px' }}
            onClick={() => {
              setActiveSection('inquiries');
              setSearchQuery('');
              setFilterCategory('');
            }}
          >
            <i className="fas fa-comments me-2"></i>
            1. Inquiries (`/inquiry`)
            <span className="badge bg-primary ms-2 rounded-pill">
              {inquiries.length}
            </span>
            {inqPending > 0 && (
              <span className="badge bg-warning text-dark ms-1 rounded-pill" title="Pending Inquiries">
                {inqPending} pending
              </span>
            )}
          </button>

          <button
            type="button"
            className={`btn pb-2 pt-2 px-3 fw-bold rounded-top-2 border-bottom-0 ${
              activeSection === 'enrollments'
                ? 'btn-light border text-success shadow-xs'
                : 'btn-link text-secondary text-decoration-none'
            }`}
            style={{ fontSize: '15px' }}
            onClick={() => {
              setActiveSection('enrollments');
              setSearchQuery('');
              setFilterCategory('');
            }}
          >
            <i className="fas fa-baby me-2"></i>
            2. Enrollments (`/enroll` & `/enool`)
            <span className="badge bg-success ms-2 rounded-pill">
              {enrollments.length}
            </span>
            {enrPending > 0 && (
              <span className="badge bg-warning text-dark ms-1 rounded-pill" title="Pending Enrollments">
                {enrPending} pending
              </span>
            )}
          </button>
        </div>

        {/* STATS SUMMARY BAR */}
        <div className="row g-3 mb-4">
          {activeSection === 'inquiries' ? (
            <>
              <div className="col-6 col-md-3">
                <div className="stats-card p-3">
                  <div className="stats-icon text-primary mb-1"><i className="fas fa-inbox"></i></div>
                  <div className="stats-content text-center">
                    <h3 className="fs-3 fw-bold mb-0">{inquiries.length}</h3>
                    <p className="small text-muted mb-0">Total Inquiries</p>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="stats-card p-3">
                  <div className="stats-icon text-warning mb-1"><i className="fas fa-clock"></i></div>
                  <div className="stats-content text-center">
                    <h3 className="fs-3 fw-bold mb-0 text-warning">{inqPending}</h3>
                    <p className="small text-muted mb-0">Pending (Need Action)</p>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="stats-card p-3">
                  <div className="stats-icon text-success mb-1"><i className="fas fa-check-circle"></i></div>
                  <div className="stats-content text-center">
                    <h3 className="fs-3 fw-bold mb-0 text-success">{inqDealt}</h3>
                    <p className="small text-muted mb-0">Dealt / Resolved</p>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="stats-card p-3">
                  <div className="stats-icon text-info mb-1"><i className="fas fa-tags"></i></div>
                  <div className="stats-content text-center">
                    <h3 className="fs-3 fw-bold mb-0">{inquiryCategories.length}</h3>
                    <p className="small text-muted mb-0">Topic Categories</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="col-6 col-md-3">
                <div className="stats-card p-3">
                  <div className="stats-icon text-success mb-1"><i className="fas fa-id-card"></i></div>
                  <div className="stats-content text-center">
                    <h3 className="fs-3 fw-bold mb-0">{enrollments.length}</h3>
                    <p className="small text-muted mb-0">Total Enrollments</p>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="stats-card p-3">
                  <div className="stats-icon text-warning mb-1"><i className="fas fa-user-clock"></i></div>
                  <div className="stats-content text-center">
                    <h3 className="fs-3 fw-bold mb-0 text-warning">{enrPending}</h3>
                    <p className="small text-muted mb-0">Pending Admission</p>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="stats-card p-3">
                  <div className="stats-icon text-success mb-1"><i className="fas fa-check-double"></i></div>
                  <div className="stats-content text-center">
                    <h3 className="fs-3 fw-bold mb-0 text-success">{enrDealt}</h3>
                    <p className="small text-muted mb-0">Confirmed / Enrolled</p>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="stats-card p-3">
                  <div className="stats-icon text-primary mb-1"><i className="fas fa-graduation-cap"></i></div>
                  <div className="stats-content text-center">
                    <h3 className="fs-3 fw-bold mb-0">{enrollmentPrograms.length}</h3>
                    <p className="small text-muted mb-0">Registered Programs</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* SECTION 1: INQUIRIES VIEW */}
        {activeSection === 'inquiries' && (
          <div className="card shadow-xs border">
            {/* Header with View Toggle & Status Filter */}
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2 py-3">
              <div className="d-flex align-items-center gap-2">
                <h5 className="card-title mb-0 fs-6 fw-bold">
                  <i className="fas fa-list me-2 text-primary"></i>
                  Inquiries List
                </h5>
                <span className="badge bg-secondary" style={{ fontSize: '12px' }}>
                  {filteredInquiries.length} shown
                </span>
                <span className="badge bg-light text-dark border small d-none d-sm-inline">
                  5 Fields: Your name • Phone • Email • What can we help with? • Your message
                </span>
              </div>

              <div className="d-flex align-items-center gap-2 flex-wrap">
                {/* View Toggle: Table vs Cards */}
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn ${viewMode === 'table' ? 'btn-dark' : 'btn-outline-secondary'}`}
                    onClick={() => setViewMode('table')}
                  >
                    <i className="fas fa-table me-1"></i> Table
                  </button>
                  <button
                    type="button"
                    className={`btn ${viewMode === 'cards' ? 'btn-dark' : 'btn-outline-secondary'}`}
                    onClick={() => setViewMode('cards')}
                  >
                    <i className="fas fa-th-large me-1"></i> Cards
                  </button>
                </div>

                {/* Filter Status: All / Pending / Dealt */}
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn ${dealtFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setDealtFilter('all')}
                  >
                    All ({inquiries.length})
                  </button>
                  <button
                    type="button"
                    className={`btn ${dealtFilter === 'pending' ? 'btn-warning text-dark' : 'btn-outline-secondary'}`}
                    onClick={() => setDealtFilter('pending')}
                  >
                    Pending ({inqPending})
                  </button>
                  <button
                    type="button"
                    className={`btn ${dealtFilter === 'dealt' ? 'btn-success' : 'btn-outline-secondary'}`}
                    onClick={() => setDealtFilter('dealt')}
                  >
                    Dealt ({inqDealt})
                  </button>
                </div>
              </div>
            </div>

            <div className="card-body p-3">
              {inquiries.length > 0 ? (
                <>
                  {/* Search and Category Filter */}
                  <div className="row g-2 mb-3">
                    <div className="col-md-7">
                      <div className="input-group">
                        <span className="input-group-text bg-white">
                          <i className="fas fa-search text-muted"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search by Your Name, Phone, Email, Topic, or Message..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <button 
                            className="btn btn-outline-secondary" 
                            type="button" 
                            onClick={() => setSearchQuery('')}
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="col-md-5">
                      <select
                        className="form-select"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                      >
                        <option value="">All Inquiry Topics ({inquiryCategories.length})</option>
                        {inquiryCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Responsive Scroll / Mode Helper */}
                  <div className="d-flex justify-content-between align-items-center mb-2 px-1 text-muted small">
                    <span>
                      <i className="fas fa-info-circle text-primary me-1"></i>
                      {viewMode === 'table'
                        ? 'Table scrolls horizontally on touch/narrow screens, or switch to Cards view.'
                        : 'Cards View is formatted for easy viewing and quick calling on mobile screens.'}
                    </span>
                    <span className="badge bg-light text-secondary border">
                      {viewMode === 'table' ? '↔ Horizontal Scroll' : '📱 Responsive Cards'}
                    </span>
                  </div>

                  {viewMode === 'table' ? (
                    /* SPREADSHEET TABLE: 5 INQUIRY PARAMETERS */
                    <div className="table-responsive shadow-xs">
                      <table className="table table-hover align-middle mb-0" style={{ minWidth: '980px' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '115px', minWidth: '115px', textAlign: 'center', whiteSpace: 'nowrap' }} onClick={() => handleSort(0)}>
                              Tick / Done <i className="fas fa-sort"></i>
                            </th>
                            <th style={{ width: '180px', minWidth: '180px', whiteSpace: 'nowrap' }} onClick={() => handleSort(1)}>
                              Your Name <i className="fas fa-sort"></i>
                            </th>
                            <th style={{ width: '150px', minWidth: '150px', whiteSpace: 'nowrap' }} onClick={() => handleSort(2)}>
                              Phone Number <i className="fas fa-sort"></i>
                            </th>
                            <th style={{ width: '200px', minWidth: '200px' }} onClick={() => handleSort(3)}>
                              Email Address <i className="fas fa-sort"></i>
                            </th>
                            <th style={{ width: '190px', minWidth: '190px', whiteSpace: 'nowrap' }} onClick={() => handleSort(4)}>
                              What Can We Help With? <i className="fas fa-sort"></i>
                            </th>
                            <th style={{ minWidth: '240px' }}>Your Message</th>
                            <th style={{ width: '130px', minWidth: '130px', whiteSpace: 'nowrap' }} onClick={() => handleSort(5)}>
                              Date Received <i className="fas fa-sort"></i>
                            </th>
                            <th style={{ width: '95px', minWidth: '95px', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedInquiries.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="text-center py-4 text-muted">
                                No inquiries match your search or filter.
                              </td>
                            </tr>
                          ) : (
                            sortedInquiries.map((inq) => (
                              <tr
                                key={inq.id}
                                style={{
                                  cursor: 'pointer',
                                  backgroundColor: inq.dealt ? '#f8fafc' : '#ffffff'
                                }}
                                onClick={() => setSelectedInquiry(inq)}
                              >
                                {/* 1. Tick / Done */}
                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleInquiryDealt(inq.id, !inq.dealt)}
                                    className="btn btn-sm"
                                    style={{
                                      backgroundColor: inq.dealt ? '#ecfdf5' : '#f8fafc',
                                      borderColor: inq.dealt ? '#10b981' : '#cbd5e1',
                                      color: inq.dealt ? '#047857' : '#64748b',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      padding: '0.25rem 0.65rem',
                                      borderRadius: '6px'
                                    }}
                                  >
                                    <i className={inq.dealt ? 'fas fa-check-circle text-success me-1' : 'far fa-circle text-muted me-1'}></i>
                                    {inq.dealt ? 'Dealt' : 'Pending'}
                                  </button>
                                </td>

                                {/* 2. Your Name */}
                                <td>
                                  <div className="d-flex align-items-center gap-1.5 flex-wrap">
                                    <strong style={{ color: inq.dealt ? '#475569' : '#0f172a' }}>
                                      {inq.your_name}
                                    </strong>
                                    {inq.dealt && <span className="badge bg-success ms-1" style={{ fontSize: '10px' }}>Done</span>}
                                  </div>
                                  <small className="text-muted font-monospace" style={{ fontSize: '11px' }}>
                                    {inq.ticket_number}
                                  </small>
                                </td>

                                {/* 3. Phone Number */}
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  {inq.phone ? (
                                    <a
                                      href={`tel:${inq.phone}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-decoration-none text-dark fw-medium"
                                      style={{ fontSize: '13px' }}
                                    >
                                      <i className="fas fa-phone-alt text-muted me-1" style={{ fontSize: '11px' }}></i>
                                      {inq.phone}
                                    </a>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>

                                {/* 4. Email Address */}
                                <td style={{ wordBreak: 'break-all' }}>
                                  <a
                                    href={`mailto:${inq.email}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-decoration-none text-secondary"
                                    style={{ fontSize: '13px' }}
                                  >
                                    {inq.email}
                                  </a>
                                </td>

                                {/* 5. What Can We Help With? */}
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  <span style={{
                                    background: inq.dealt ? '#f3f4f6' : '#e0e7ff',
                                    color: inq.dealt ? '#4b5563' : '#3730a3',
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    display: 'inline-block'
                                  }}>
                                    {inq.what_can_we_help_with}
                                  </span>
                                </td>

                                {/* 6. Your Message */}
                                <td style={{ maxWidth: '280px' }}>
                                  <div className="text-truncate small text-secondary" title={inq.your_message || 'No message'}>
                                    {inq.your_message || <em className="text-muted">No message</em>}
                                  </div>
                                </td>

                                {/* 7. Date Received */}
                                <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                                  <span className="text-muted">
                                    <i className="far fa-clock me-1"></i>
                                    {inq.timestamp}
                                  </span>
                                </td>

                                {/* Actions */}
                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                  <div className="btn-group btn-group-sm">
                                    <button
                                      type="button"
                                      className="btn btn-outline-primary"
                                      onClick={() => setSelectedInquiry(inq)}
                                      title="View inquiry details"
                                    >
                                      <i className="fas fa-eye"></i>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger"
                                      onClick={() => requestDeleteInquiry(inq)}
                                      title="Delete inquiry"
                                    >
                                      <i className="fas fa-trash"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* RESPONSIVE CARDS VIEW FOR INQUIRIES */
                    <div className="row g-3">
                      {sortedInquiries.length === 0 ? (
                        <div className="col-12 text-center py-4 text-muted">
                          No inquiries match your search or filter.
                        </div>
                      ) : (
                        sortedInquiries.map((inq) => (
                          <div key={inq.id} className="col-12 col-md-6 col-xl-4">
                            <div
                              className="card h-100 border shadow-xs"
                              style={{
                                backgroundColor: inq.dealt ? '#f8fafc' : '#ffffff',
                                borderRadius: '12px'
                              }}
                            >
                              <div className="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center py-2 px-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleInquiryDealt(inq.id, !inq.dealt)}
                                  className="btn btn-sm"
                                  style={{
                                    backgroundColor: inq.dealt ? '#ecfdf5' : '#f1f5f9',
                                    borderColor: inq.dealt ? '#10b981' : '#cbd5e1',
                                    color: inq.dealt ? '#047857' : '#475569',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '6px'
                                  }}
                                >
                                  <i className={inq.dealt ? 'fas fa-check-circle text-success me-1' : 'far fa-circle text-muted me-1'}></i>
                                  {inq.dealt ? 'Dealt' : 'Pending'}
                                </button>
                                
                                <div className="d-flex align-items-center gap-2">
                                  <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: '11px' }}>
                                    {inq.ticket_number}
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger border-0 p-1"
                                    onClick={() => requestDeleteInquiry(inq)}
                                    title="Delete inquiry"
                                  >
                                    <i className="fas fa-trash-alt"></i>
                                  </button>
                                </div>
                              </div>

                              <div className="card-body p-3">
                                <h6 className="fw-bold text-dark mb-2">
                                  <i className="fas fa-user-circle text-primary me-1.5"></i>
                                  {inq.your_name}
                                </h6>

                                <div className="mb-2">
                                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1" style={{ fontSize: '12px' }}>
                                    Topic: {inq.what_can_we_help_with}
                                  </span>
                                </div>

                                <div className="small mb-2.5">
                                  {inq.phone && (
                                    <div className="mb-1">
                                      <a href={`tel:${inq.phone}`} className="text-decoration-none text-dark fw-medium d-inline-flex align-items-center gap-1">
                                        <i className="fas fa-phone-alt text-success" style={{ width: '16px' }}></i>
                                        {inq.phone}
                                      </a>
                                    </div>
                                  )}
                                  <div>
                                    <a href={`mailto:${inq.email}`} className="text-decoration-none text-secondary d-inline-flex align-items-center gap-1 text-truncate" style={{ maxWidth: '100%' }}>
                                      <i className="fas fa-envelope text-primary" style={{ width: '16px' }}></i>
                                      {inq.email}
                                    </a>
                                  </div>
                                </div>

                                {inq.your_message && (
                                  <div className="p-2 rounded border bg-light-subtle small text-muted text-truncate" title={inq.your_message}>
                                    <i className="fas fa-quote-left text-muted me-1" style={{ opacity: 0.5 }}></i>
                                    {inq.your_message}
                                  </div>
                                )}
                              </div>

                              <div className="card-footer bg-transparent border-top py-2 px-3 d-flex justify-content-between align-items-center">
                                <small className="text-muted" style={{ fontSize: '11px' }}>
                                  <i className="far fa-clock me-1"></i>
                                  {inq.timestamp}
                                </small>
                                <button
                                  type="button"
                                  className="btn btn-outline-primary btn-sm py-1 px-2"
                                  style={{ fontSize: '12px' }}
                                  onClick={() => setSelectedInquiry(inq)}
                                >
                                  <i className="fas fa-eye me-1"></i>
                                  Details
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-envelope-open fa-3x text-muted mb-3" style={{ opacity: 0.5 }}></i>
                  <h5>No inquiries yet</h5>
                  <p className="text-muted mb-3">
                    Submissions from your website inquiry form (using <code>/inquiry</code>) will appear here in real time.
                  </p>
                  <div className="d-flex justify-content-center gap-2">
                    <button
                      onClick={() => {
                        setTestModalTab('inquiry');
                        setShowTestModal(true);
                      }}
                      className="btn btn-primary btn-sm"
                    >
                      <i className="fas fa-paper-plane me-1"></i>
                      Send Sample Inquiry
                    </button>
                    <button
                      onClick={() => {
                        setScriptModalTab('inquiry');
                        setShowScriptModal(true);
                      }}
                      className="btn btn-outline-secondary btn-sm"
                    >
                      <i className="fas fa-code me-1"></i>
                      Get /inquiry Code
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 2: ENROLLMENTS VIEW */}
        {activeSection === 'enrollments' && (
          <div className="card shadow-xs border">
            {/* Header with View Toggle & Status Filter */}
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2 py-3">
              <div className="d-flex align-items-center gap-2">
                <h5 className="card-title mb-0 fs-6 fw-bold">
                  <i className="fas fa-user-graduate me-2 text-success"></i>
                  Daycare Enrollments List
                </h5>
                <span className="badge bg-secondary" style={{ fontSize: '12px' }}>
                  {filteredEnrollments.length} shown
                </span>
                <span className="badge bg-light text-dark border small d-none d-sm-inline">
                  Endpoint: <code>/enroll</code> (or <code>/enool</code>)
                </span>
              </div>

              <div className="d-flex align-items-center gap-2 flex-wrap">
                {/* View Toggle */}
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn ${viewMode === 'table' ? 'btn-dark' : 'btn-outline-secondary'}`}
                    onClick={() => setViewMode('table')}
                  >
                    <i className="fas fa-table me-1"></i> Table
                  </button>
                  <button
                    type="button"
                    className={`btn ${viewMode === 'cards' ? 'btn-dark' : 'btn-outline-secondary'}`}
                    onClick={() => setViewMode('cards')}
                  >
                    <i className="fas fa-th-large me-1"></i> Cards
                  </button>
                </div>

                {/* Filter Status: All / Pending / Dealt */}
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn ${dealtFilter === 'all' ? 'btn-success' : 'btn-outline-secondary'}`}
                    onClick={() => setDealtFilter('all')}
                  >
                    All ({enrollments.length})
                  </button>
                  <button
                    type="button"
                    className={`btn ${dealtFilter === 'pending' ? 'btn-warning text-dark' : 'btn-outline-secondary'}`}
                    onClick={() => setDealtFilter('pending')}
                  >
                    Pending ({enrPending})
                  </button>
                  <button
                    type="button"
                    className={`btn ${dealtFilter === 'dealt' ? 'btn-success' : 'btn-outline-secondary'}`}
                    onClick={() => setDealtFilter('dealt')}
                  >
                    Confirmed ({enrDealt})
                  </button>
                </div>
              </div>
            </div>

            <div className="card-body p-3">
              {enrollments.length > 0 ? (
                <>
                  {/* Search and Program Filter */}
                  <div className="row g-2 mb-3">
                    <div className="col-md-7">
                      <div className="input-group">
                        <span className="input-group-text bg-white">
                          <i className="fas fa-search text-muted"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search Parent, Child Name, Age, Phone, Email, Program, or Notes..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <button 
                            className="btn btn-outline-secondary" 
                            type="button" 
                            onClick={() => setSearchQuery('')}
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="col-md-5">
                      <select
                        className="form-select"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                      >
                        <option value="">All Programs ({enrollmentPrograms.length})</option>
                        {enrollmentPrograms.map(prog => (
                          <option key={prog} value={prog}>{prog}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Responsive Scroll / Mode Helper */}
                  <div className="d-flex justify-content-between align-items-center mb-2 px-1 text-muted small">
                    <span>
                      <i className="fas fa-info-circle text-success me-1"></i>
                      {viewMode === 'table'
                        ? 'Table scrolls horizontally on touch/narrow screens, or switch to Cards view.'
                        : 'Cards View shows full child, program, and parent details on mobile screens.'}
                    </span>
                    <span className="badge bg-light text-secondary border">
                      {viewMode === 'table' ? '↔ Horizontal Scroll' : '📱 Responsive Cards'}
                    </span>
                  </div>

                  {viewMode === 'table' ? (
                    /* SPREADSHEET TABLE: ENROLLMENTS */
                    <div className="table-responsive shadow-xs">
                      <table className="table table-hover align-middle mb-0" style={{ minWidth: '1140px' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '120px', minWidth: '120px', textAlign: 'center', whiteSpace: 'nowrap' }} onClick={() => handleSort(0)}>
                              Tick / Done <i className="fas fa-sort"></i>
                            </th>
                            <th style={{ width: '170px', minWidth: '170px', whiteSpace: 'nowrap' }} onClick={() => handleSort(1)}>
                              Parent / Guardian <i className="fas fa-sort"></i>
                            </th>
                            <th style={{ width: '150px', minWidth: '150px', whiteSpace: 'nowrap' }} onClick={() => handleSort(2)}>
                              Child & Age <i className="fas fa-sort"></i>
                            </th>
                            <th style={{ width: '140px', minWidth: '140px', whiteSpace: 'nowrap' }} onClick={() => handleSort(3)}>
                              Phone <i className="fas fa-sort"></i>
                            </th>
                            <th style={{ width: '190px', minWidth: '190px' }} onClick={() => handleSort(4)}>
                              Email Address <i className="fas fa-sort"></i>
                            </th>
                            <th style={{ width: '180px', minWidth: '180px', whiteSpace: 'nowrap' }} onClick={() => handleSort(5)}>
                              Preferred Program <i className="fas fa-sort"></i>
                            </th>
                            <th style={{ width: '125px', minWidth: '125px', whiteSpace: 'nowrap' }} onClick={() => handleSort(6)}>
                              Start Date <i className="fas fa-sort"></i>
                            </th>
                            <th style={{ minWidth: '220px', maxWidth: '300px' }}>Notes / Special Needs</th>
                            <th style={{ width: '95px', minWidth: '95px', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedEnrollments.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="text-center py-4 text-muted">
                                No enrollments match your search or filter.
                              </td>
                            </tr>
                          ) : (
                            sortedEnrollments.map((enr) => (
                              <tr
                                key={enr.id}
                                style={{
                                  cursor: 'pointer',
                                  backgroundColor: enr.dealt ? '#f8fafc' : '#ffffff'
                                }}
                                onClick={() => setSelectedEnrollment(enr)}
                              >
                                {/* 1. Tick / Done */}
                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleEnrollmentDealt(enr.id, !enr.dealt)}
                                    className="btn btn-sm"
                                    style={{
                                      backgroundColor: enr.dealt ? '#ecfdf5' : '#f8fafc',
                                      borderColor: enr.dealt ? '#10b981' : '#cbd5e1',
                                      color: enr.dealt ? '#047857' : '#64748b',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      padding: '0.25rem 0.65rem',
                                      borderRadius: '6px'
                                    }}
                                  >
                                    <i className={enr.dealt ? 'fas fa-check-circle text-success me-1' : 'far fa-circle text-muted me-1'}></i>
                                    {enr.dealt ? 'Confirmed' : 'Pending'}
                                  </button>
                                </td>

                                {/* 2. Parent Name */}
                                <td>
                                  <div className="d-flex align-items-center gap-1.5 flex-wrap">
                                    <strong style={{ color: enr.dealt ? '#475569' : '#0f172a' }}>
                                      {enr.parent_name}
                                    </strong>
                                    {enr.dealt && <span className="badge bg-success ms-1" style={{ fontSize: '10px' }}>Confirmed</span>}
                                  </div>
                                  <small className="text-muted font-monospace" style={{ fontSize: '11px' }}>
                                    {enr.enrollment_number}
                                  </small>
                                </td>

                                {/* 3. Child & Age */}
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  {enr.child_name ? (
                                    <div className="d-flex align-items-center gap-1 flex-wrap">
                                      <span className="fw-semibold text-dark">
                                        <i className="fas fa-shapes text-primary me-1" style={{ fontSize: '11px' }}></i>
                                        {enr.child_name}
                                      </span>
                                      {enr.child_age && (
                                        <span className="badge bg-light text-dark border" style={{ fontSize: '11px' }}>
                                          {enr.child_age}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted small"><em>Not provided</em></span>
                                  )}
                                </td>

                                {/* 4. Phone */}
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  {enr.phone ? (
                                    <a
                                      href={`tel:${enr.phone}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-decoration-none text-dark fw-medium"
                                      style={{ fontSize: '13px' }}
                                    >
                                      <i className="fas fa-phone-alt text-muted me-1" style={{ fontSize: '11px' }}></i>
                                      {enr.phone}
                                    </a>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>

                                {/* 5. Email */}
                                <td style={{ wordBreak: 'break-all' }}>
                                  <a
                                    href={`mailto:${enr.email}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-decoration-none text-secondary"
                                    style={{ fontSize: '13px' }}
                                  >
                                    {enr.email}
                                  </a>
                                </td>

                                {/* 6. Program */}
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  <span style={{
                                    background: enr.dealt ? '#f3f4f6' : '#dcfce7',
                                    color: enr.dealt ? '#4b5563' : '#15803d',
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    display: 'inline-block'
                                  }}>
                                    {enr.preferred_program}
                                  </span>
                                </td>

                                {/* 7. Start Date */}
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  {enr.preferred_start_date ? (
                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>
                                      <i className="far fa-calendar-alt text-muted me-1"></i>
                                      {enr.preferred_start_date}
                                    </span>
                                  ) : (
                                    <span className="text-muted small">Flexible</span>
                                  )}
                                </td>

                                {/* 8. Message */}
                                <td style={{ maxWidth: '280px' }}>
                                  <div className="text-truncate small text-secondary" title={enr.message || 'No notes'}>
                                    {enr.message || <em className="text-muted">No notes</em>}
                                  </div>
                                </td>

                                {/* Actions */}
                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                  <div className="btn-group btn-group-sm">
                                    <button
                                      type="button"
                                      className="btn btn-outline-primary"
                                      onClick={() => setSelectedEnrollment(enr)}
                                      title="View enrollment details"
                                    >
                                      <i className="fas fa-eye"></i>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger"
                                      onClick={() => requestDeleteEnrollment(enr)}
                                      title="Delete enrollment"
                                    >
                                      <i className="fas fa-trash"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* RESPONSIVE CARDS VIEW FOR ENROLLMENTS */
                    <div className="row g-3">
                      {sortedEnrollments.length === 0 ? (
                        <div className="col-12 text-center py-4 text-muted">
                          No enrollments match your search or filter.
                        </div>
                      ) : (
                        sortedEnrollments.map((enr) => (
                          <div key={enr.id} className="col-12 col-md-6 col-xl-4">
                            <div
                              className="card h-100 border shadow-xs"
                              style={{
                                backgroundColor: enr.dealt ? '#f8fafc' : '#ffffff',
                                borderRadius: '12px'
                              }}
                            >
                              <div className="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center py-2 px-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleEnrollmentDealt(enr.id, !enr.dealt)}
                                  className="btn btn-sm"
                                  style={{
                                    backgroundColor: enr.dealt ? '#ecfdf5' : '#f1f5f9',
                                    borderColor: enr.dealt ? '#10b981' : '#cbd5e1',
                                    color: enr.dealt ? '#047857' : '#475569',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '6px'
                                  }}
                                >
                                  <i className={enr.dealt ? 'fas fa-check-circle text-success me-1' : 'far fa-circle text-muted me-1'}></i>
                                  {enr.dealt ? 'Confirmed' : 'Pending'}
                                </button>
                                
                                <div className="d-flex align-items-center gap-2">
                                  <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: '11px' }}>
                                    {enr.enrollment_number}
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger border-0 p-1"
                                    onClick={() => requestDeleteEnrollment(enr)}
                                    title="Delete enrollment"
                                  >
                                    <i className="fas fa-trash-alt"></i>
                                  </button>
                                </div>
                              </div>

                              <div className="card-body p-3">
                                <h6 className="fw-bold text-dark mb-2">
                                  <i className="fas fa-user-circle text-success me-1.5"></i>
                                  {enr.parent_name}
                                </h6>

                                <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                                  <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1" style={{ fontSize: '12px' }}>
                                    <i className="fas fa-shapes me-1"></i>
                                    Child: {enr.child_name || 'N/A'}
                                  </span>
                                  {enr.child_age && (
                                    <span className="badge bg-light text-dark border px-2 py-1" style={{ fontSize: '12px' }}>
                                      Age: {enr.child_age}
                                    </span>
                                  )}
                                </div>

                                <div className="p-2 rounded bg-light mb-2.5 small">
                                  <div className="d-flex justify-content-between mb-1">
                                    <span className="text-muted">Program:</span>
                                    <strong className="text-success">{enr.preferred_program}</strong>
                                  </div>
                                  <div className="d-flex justify-content-between">
                                    <span className="text-muted">Start Date:</span>
                                    <strong>{enr.preferred_start_date || 'Flexible'}</strong>
                                  </div>
                                </div>

                                <div className="small mb-2.5">
                                  {enr.phone && (
                                    <div className="mb-1">
                                      <a href={`tel:${enr.phone}`} className="text-decoration-none text-dark fw-medium d-inline-flex align-items-center gap-1">
                                        <i className="fas fa-phone-alt text-success" style={{ width: '16px' }}></i>
                                        {enr.phone}
                                      </a>
                                    </div>
                                  )}
                                  <div>
                                    <a href={`mailto:${enr.email}`} className="text-decoration-none text-secondary d-inline-flex align-items-center gap-1 text-truncate" style={{ maxWidth: '100%' }}>
                                      <i className="fas fa-envelope text-primary" style={{ width: '16px' }}></i>
                                      {enr.email}
                                    </a>
                                  </div>
                                </div>

                                {enr.message && (
                                  <div className="p-2 rounded border bg-light-subtle small text-muted text-truncate" title={enr.message}>
                                    <i className="fas fa-quote-left text-muted me-1" style={{ opacity: 0.5 }}></i>
                                    {enr.message}
                                  </div>
                                )}
                              </div>

                              <div className="card-footer bg-transparent border-top py-2 px-3 d-flex justify-content-between align-items-center">
                                <small className="text-muted" style={{ fontSize: '11px' }}>
                                  <i className="far fa-clock me-1"></i>
                                  {enr.timestamp}
                                </small>
                                <button
                                  type="button"
                                  className="btn btn-outline-success btn-sm py-1 px-2"
                                  style={{ fontSize: '12px' }}
                                  onClick={() => setSelectedEnrollment(enr)}
                                >
                                  <i className="fas fa-eye me-1"></i>
                                  Details
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-graduation-cap fa-3x text-muted mb-3" style={{ opacity: 0.5 }}></i>
                  <h5>No enrollments yet</h5>
                  <p className="text-muted mb-3">
                    Submissions from your website enrollment form (using <code>/enroll</code> or <code>/enool</code>) will appear here in real time.
                  </p>
                  <div className="d-flex justify-content-center gap-2">
                    <button
                      onClick={() => {
                        setTestModalTab('enrollment');
                        setShowTestModal(true);
                      }}
                      className="btn btn-success btn-sm"
                    >
                      <i className="fas fa-paper-plane me-1"></i>
                      Send Sample Enrollment
                    </button>
                    <button
                      onClick={() => {
                        setScriptModalTab('enrollment');
                        setShowScriptModal(true);
                      }}
                      className="btn btn-outline-secondary btn-sm"
                    >
                      <i className="fas fa-code me-1"></i>
                      Get /enroll Code
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="bg-dark text-light mt-5 py-3">
        <div className="container text-center">
          <p className="mb-0 small text-muted">
            <i className="fas fa-shield-alt me-1"></i>
            Daycare Portal • Inquiries (`/inquiry`) & Enrollments (`/enroll` & `/enool`) • Last synced: {lastUpdated}
          </p>
        </div>
      </footer>

      {/* MODAL 1: INQUIRY DETAILS MODAL */}
      {selectedInquiry && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          onClick={() => setSelectedInquiry(null)}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px', overflow: 'hidden' }}>
              <div className="modal-header bg-light">
                <div>
                  <h5 className="modal-title font-weight-bold mb-0">
                    <i className="fas fa-envelope-open-text text-primary me-2"></i>
                    Inquiry Details: {selectedInquiry.ticket_number}
                  </h5>
                  <small className="text-muted">Received on {selectedInquiry.timestamp}</small>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelectedInquiry(null)}></button>
              </div>

              <div className="modal-body p-4">
                {/* Dealt / Tick Status Banner */}
                <div 
                  className={`p-3 rounded-3 mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2 ${
                    selectedInquiry.dealt ? 'bg-success-subtle border border-success' : 'bg-warning-subtle border border-warning'
                  }`}
                >
                  <div className="d-flex align-items-center gap-2">
                    <i className={`fas ${selectedInquiry.dealt ? 'fa-check-circle text-success' : 'fa-clock text-warning'} fs-4`}></i>
                    <div>
                      <strong className={selectedInquiry.dealt ? 'text-success' : 'text-dark'}>
                        {selectedInquiry.dealt ? 'This inquiry has been dealt with' : 'Pending: Needs Response'}
                      </strong>
                      <div className="small text-muted">
                        {selectedInquiry.dealt ? 'Marked as dealt with by staff.' : 'Click to tick once you have called or replied to this person.'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm ${selectedInquiry.dealt ? 'btn-outline-secondary' : 'btn-success'}`}
                    onClick={() => handleToggleInquiryDealt(selectedInquiry.id, !selectedInquiry.dealt)}
                  >
                    <i className={`fas ${selectedInquiry.dealt ? 'fa-undo' : 'fa-check'} me-1`}></i>
                    {selectedInquiry.dealt ? 'Mark as Pending' : 'Tick as Dealt With'}
                  </button>
                </div>

                {/* 5 Core Parameters Card */}
                <div className="card mb-3 border">
                  <div className="card-header bg-light py-2">
                    <strong className="small text-uppercase text-secondary">
                      <i className="fas fa-list-ol me-1 text-primary"></i>
                      5 Inquiry Parameters
                    </strong>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      {/* 1. Your name */}
                      <div className="col-md-4">
                        <label className="text-muted small d-block">1. Your name</label>
                        <span className="fw-bold fs-6">{selectedInquiry.your_name}</span>
                      </div>

                      {/* 2. Phone number */}
                      <div className="col-md-4">
                        <label className="text-muted small d-block">2. Phone number</label>
                        {selectedInquiry.phone ? (
                          <a href={`tel:${selectedInquiry.phone}`} className="fw-bold fs-6 text-decoration-none">
                            <i className="fas fa-phone-alt me-1 text-muted small"></i>
                            {selectedInquiry.phone}
                          </a>
                        ) : (
                          <span className="text-muted">Not provided</span>
                        )}
                      </div>

                      {/* 3. Email address */}
                      <div className="col-md-4">
                        <label className="text-muted small d-block">3. Email address</label>
                        <a href={`mailto:${selectedInquiry.email}`} className="fw-bold fs-6 text-decoration-none">
                          <i className="fas fa-envelope me-1 text-muted small"></i>
                          {selectedInquiry.email}
                        </a>
                      </div>

                      {/* 4. What can we help with? */}
                      <div className="col-12">
                        <label className="text-muted small d-block">4. What can we help with?</label>
                        <span className="badge bg-primary fs-6 px-3 py-2 fw-semibold">
                          {selectedInquiry.what_can_we_help_with}
                        </span>
                      </div>

                      {/* 5. Your message */}
                      <div className="col-12">
                        <label className="text-muted small d-block">5. Your message</label>
                        <div className="p-3 bg-light rounded-3 border">
                          <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                            {selectedInquiry.your_message || <em className="text-muted">No message provided.</em>}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light d-flex justify-content-between">
                <div>
                  {selectedInquiry.phone && (
                    <a href={`tel:${selectedInquiry.phone}`} className="btn btn-outline-success btn-sm me-2">
                      <i className="fas fa-phone me-1"></i>
                      Call
                    </a>
                  )}
                  <a href={`mailto:${selectedInquiry.email}`} className="btn btn-primary btn-sm me-2">
                    <i className="fas fa-envelope me-1"></i>
                    Email Reply
                  </a>
                </div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => {
                      requestDeleteInquiry(selectedInquiry);
                    }}
                  >
                    <i className="fas fa-trash me-1"></i>
                    Delete
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedInquiry(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ENROLLMENT DETAILS MODAL */}
      {selectedEnrollment && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          onClick={() => setSelectedEnrollment(null)}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px', overflow: 'hidden' }}>
              <div className="modal-header bg-light">
                <div>
                  <h5 className="modal-title font-weight-bold mb-0">
                    <i className="fas fa-user-graduate text-success me-2"></i>
                    Enrollment Registration: {selectedEnrollment.enrollment_number}
                  </h5>
                  <small className="text-muted">Received on {selectedEnrollment.timestamp}</small>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelectedEnrollment(null)}></button>
              </div>

              <div className="modal-body p-4">
                {/* Dealt / Status Banner */}
                <div 
                  className={`p-3 rounded-3 mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2 ${
                    selectedEnrollment.dealt ? 'bg-success-subtle border border-success' : 'bg-warning-subtle border border-warning'
                  }`}
                >
                  <div className="d-flex align-items-center gap-2">
                    <i className={`fas ${selectedEnrollment.dealt ? 'fa-check-circle text-success' : 'fa-clock text-warning'} fs-4`}></i>
                    <div>
                      <strong className={selectedEnrollment.dealt ? 'text-success' : 'text-dark'}>
                        {selectedEnrollment.dealt ? 'Enrollment Confirmed / Processed' : 'Pending: Awaiting Admission Review'}
                      </strong>
                      <div className="small text-muted">
                        {selectedEnrollment.dealt ? 'Registration confirmed in daycare records.' : 'Click to tick once the child is registered.'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm ${selectedEnrollment.dealt ? 'btn-outline-secondary' : 'btn-success'}`}
                    onClick={() => handleToggleEnrollmentDealt(selectedEnrollment.id, !selectedEnrollment.dealt)}
                  >
                    <i className={`fas ${selectedEnrollment.dealt ? 'fa-undo' : 'fa-check'} me-1`}></i>
                    {selectedEnrollment.dealt ? 'Mark as Pending' : 'Confirm Enrollment'}
                  </button>
                </div>

                {/* Parent & Child info cards */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="card h-100 border">
                      <div className="card-header bg-light py-2">
                        <strong className="small text-uppercase text-secondary">
                          <i className="fas fa-user-friends me-1 text-primary"></i>
                          Parent or Guardian
                        </strong>
                      </div>
                      <div className="card-body">
                        <div className="mb-2">
                          <label className="text-muted small d-block">Parent Name</label>
                          <span className="fw-bold fs-6">{selectedEnrollment.parent_name}</span>
                        </div>
                        <div className="mb-2">
                          <label className="text-muted small d-block">Phone Number</label>
                          {selectedEnrollment.phone ? (
                            <a href={`tel:${selectedEnrollment.phone}`} className="fw-bold fs-6 text-decoration-none">
                              {selectedEnrollment.phone}
                            </a>
                          ) : (
                            <span className="text-muted">Not provided</span>
                          )}
                        </div>
                        <div>
                          <label className="text-muted small d-block">Email Address</label>
                          <a href={`mailto:${selectedEnrollment.email}`} className="fw-bold fs-6 text-decoration-none">
                            {selectedEnrollment.email}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="card h-100 border">
                      <div className="card-header bg-light py-2">
                        <strong className="small text-uppercase text-secondary">
                          <i className="fas fa-baby me-1 text-info"></i>
                          Child’s Information
                        </strong>
                      </div>
                      <div className="card-body">
                        <div className="mb-2">
                          <label className="text-muted small d-block">Child’s Name</label>
                          <span className="fw-bold fs-6 text-dark">{selectedEnrollment.child_name || 'Not provided'}</span>
                        </div>
                        <div className="mb-2">
                          <label className="text-muted small d-block">Child’s Age</label>
                          <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle fs-6">
                            {selectedEnrollment.child_age || 'Not provided'}
                          </span>
                        </div>
                        <div>
                          <label className="text-muted small d-block">Preferred Program</label>
                          <span className="badge bg-success fs-6">
                            {selectedEnrollment.preferred_program}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Start Date & Special Notes */}
                <div className="card border">
                  <div className="card-header bg-light py-2">
                    <strong className="small text-uppercase text-secondary">
                      <i className="far fa-calendar-alt me-1 text-warning"></i>
                      Start Date & Notes
                    </strong>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label className="text-muted small d-block">Preferred Start Date</label>
                      <span className="fw-bold">{selectedEnrollment.preferred_start_date || 'Flexible'}</span>
                    </div>
                    <div>
                      <label className="text-muted small d-block">Notes / Special Requirements / Message</label>
                      <div className="p-3 bg-light rounded border">
                        {selectedEnrollment.message || <em className="text-muted">No notes provided.</em>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light d-flex justify-content-between">
                <div>
                  {selectedEnrollment.phone && (
                    <a href={`tel:${selectedEnrollment.phone}`} className="btn btn-outline-success btn-sm me-2">
                      <i className="fas fa-phone me-1"></i>
                      Call Parent
                    </a>
                  )}
                  <a href={`mailto:${selectedEnrollment.email}`} className="btn btn-success btn-sm me-2">
                    <i className="fas fa-envelope me-1"></i>
                    Email Parent
                  </a>
                </div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => requestDeleteEnrollment(selectedEnrollment)}
                  >
                    <i className="fas fa-trash me-1"></i>
                    Delete
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedEnrollment(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: TEST FORM SIMULATOR */}
      {showTestModal && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          onClick={() => setShowTestModal(false)}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px', overflow: 'hidden' }}>
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">
                  <i className="fas fa-paper-plane text-primary me-2"></i>
                  Submit a Test Form
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowTestModal(false)}></button>
              </div>

              {/* Tabs inside Test modal */}
              <div className="px-4 pt-3 border-bottom bg-light-subtle d-flex gap-2">
                <button
                  type="button"
                  className={`btn btn-sm ${testModalTab === 'inquiry' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setTestModalTab('inquiry')}
                >
                  <i className="fas fa-comments me-1"></i>
                  Test Inquiry (`/inquiry`)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${testModalTab === 'enrollment' ? 'btn-success' : 'btn-outline-secondary'}`}
                  onClick={() => setTestModalTab('enrollment')}
                >
                  <i className="fas fa-baby me-1"></i>
                  Test Enrollment (`/enroll` & `/enool`)
                </button>
              </div>

              <div className="modal-body p-4">
                {testModalTab === 'inquiry' ? (
                  /* INQUIRY TEST FORM (5 parameters) */
                  <form onSubmit={handleSendTestInquiry}>
                    <div className="alert alert-info py-2 px-3 small mb-3">
                      <strong>Endpoint: <code>/inquiry</code></strong> with the 5 parameters you specified:
                      <br /><code>Your name</code>, <code>Phone number</code>, <code>Email address</code>, <code>What can we help with?</code>, <code>Your message</code>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">Your name</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={testInqName}
                          onChange={(e) => setTestInqName(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">Phone number</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={testInqPhone}
                          onChange={(e) => setTestInqPhone(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">Email address</label>
                        <input
                          type="email"
                          className="form-control"
                          required
                          value={testInqEmail}
                          onChange={(e) => setTestInqEmail(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">What can we help with?</label>
                        <select
                          className="form-select"
                          value={testInqHelpWith}
                          onChange={(e) => setTestInqHelpWith(e.target.value)}
                        >
                          <option value="Schedule a Campus Tour">Schedule a Campus Tour</option>
                          <option value="Tuition & Fee Structure">Tuition & Fee Structure</option>
                          <option value="Infant Program Availability">Infant Program Availability</option>
                          <option value="Toddler Program Inquiries">Toddler Program Inquiries</option>
                          <option value="General Question">General Question</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold small">Your message</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={testInqMessage}
                          onChange={(e) => setTestInqMessage(e.target.value)}
                        ></textarea>
                      </div>
                    </div>

                    <div className="mt-4 d-flex justify-content-end gap-2">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowTestModal(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={testInqSending}>
                        <i className={`fas ${testInqSending ? 'fa-spinner fa-spin' : 'fa-paper-plane'} me-1`}></i>
                        Send Test Inquiry to /inquiry
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ENROLLMENT TEST FORM (/enroll & /enool) */
                  <form onSubmit={handleSendTestEnrollment}>
                    <div className="alert alert-success py-2 px-3 small mb-3">
                      <strong>Choose Endpoint:</strong> You can send to either <code>/enroll</code> or <code>/enool</code>:
                      <div className="btn-group btn-group-sm mt-1 d-block">
                        <button
                          type="button"
                          className={`btn ${testEnrEndpoint === '/enroll' ? 'btn-success' : 'btn-outline-success'}`}
                          onClick={() => setTestEnrEndpoint('/enroll')}
                        >
                          Send to /enroll
                        </button>
                        <button
                          type="button"
                          className={`btn ${testEnrEndpoint === '/enool' ? 'btn-success' : 'btn-outline-success'}`}
                          onClick={() => setTestEnrEndpoint('/enool')}
                        >
                          Send to /enool
                        </button>
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">Parent or guardian name</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={testEnrParent}
                          onChange={(e) => setTestEnrParent(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">Phone number</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={testEnrPhone}
                          onChange={(e) => setTestEnrPhone(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">Email address</label>
                        <input
                          type="email"
                          className="form-control"
                          required
                          value={testEnrEmail}
                          onChange={(e) => setTestEnrEmail(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">Child's name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={testEnrChild}
                          onChange={(e) => setTestEnrChild(e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold small">Child's age</label>
                        <input
                          type="text"
                          className="form-control"
                          value={testEnrAge}
                          onChange={(e) => setTestEnrAge(e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold small">Preferred program</label>
                        <select
                          className="form-select"
                          value={testEnrProgram}
                          onChange={(e) => setTestEnrProgram(e.target.value)}
                        >
                          <option value="Toddler Program (Full-Day)">Toddler Program (Full-Day)</option>
                          <option value="Infant Care (0 - 18 mos)">Infant Care (0 - 18 mos)</option>
                          <option value="Pre-K Early Learning">Pre-K Early Learning</option>
                          <option value="Before & After School Care">Before & After School Care</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold small">Preferred start date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={testEnrDate}
                          onChange={(e) => setTestEnrDate(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold small">Your message / Special notes</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          value={testEnrNotes}
                          onChange={(e) => setTestEnrNotes(e.target.value)}
                        ></textarea>
                      </div>
                    </div>

                    <div className="mt-4 d-flex justify-content-end gap-2">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowTestModal(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-success" disabled={testEnrSending}>
                        <i className={`fas ${testEnrSending ? 'fa-spinner fa-spin' : 'fa-paper-plane'} me-1`}></i>
                        Send Test Enrollment to {testEnrEndpoint}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: WEBSITE CODE MODAL */}
      {showScriptModal && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          onClick={() => setShowScriptModal(false)}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px', overflow: 'hidden' }}>
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">
                  <i className="fas fa-code text-primary me-2"></i>
                  Website Integration Code
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowScriptModal(false)}></button>
              </div>

              {/* Tabs for code snippet */}
              <div className="px-4 pt-3 border-bottom bg-light-subtle d-flex gap-2">
                <button
                  type="button"
                  className={`btn btn-sm ${scriptModalTab === 'inquiry' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setScriptModalTab('inquiry')}
                >
                  <i className="fas fa-comments me-1"></i>
                  Inquiry Form Code (`/inquiry`)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${scriptModalTab === 'enrollment' ? 'btn-success' : 'btn-outline-secondary'}`}
                  onClick={() => setScriptModalTab('enrollment')}
                >
                  <i className="fas fa-baby me-1"></i>
                  Enrollment Form Code (`/enroll` & `/enool`)
                </button>
              </div>

              <div className="modal-body p-4">
                {scriptModalTab === 'inquiry' ? (
                  <>
                    <h6 className="fw-bold text-dark">
                      1. Inquiries Endpoint: <code>/inquiry</code>
                    </h6>
                    <p className="text-secondary small mb-2">
                      Send submissions from your contact or inquiry form with these exact 5 parameters:
                    </p>
                    <div className="bg-light p-2 rounded mb-3 small font-monospace">
                      1. Your name<br />
                      2. Phone number<br />
                      3. Email address<br />
                      4. What can we help with?<br />
                      5. Your message
                    </div>

                    <h6 className="fw-semibold small text-muted">HTML / JavaScript Snippet for your website:</h6>
                    <pre className="bg-dark text-light p-3 rounded" style={{ fontSize: '12px', maxHeight: '250px', overflowY: 'auto' }}>
{`// Example: Sending from your website inquiry form to /inquiry
const inquiryData = new URLSearchParams({
  'Your name': document.getElementById('your_name').value,
  'Phone number': document.getElementById('phone_number').value,
  'Email address': document.getElementById('email_address').value,
  'What can we help with?': document.getElementById('help_topic').value,
  'Your message': document.getElementById('your_message').value
});

fetch('https://your-domain.vercel.app/inquiry?' + inquiryData.toString())
  .then(res => res.json())
  .then(data => {
    console.log('Inquiry saved!', data.ticket_number);
    alert('Thank you! Your inquiry has been received.');
  })
  .catch(err => console.error(err));`}
                    </pre>
                  </>
                ) : (
                  <>
                    <h6 className="fw-bold text-dark">
                      2. Enrollments Endpoint: <code>/enroll</code> (or <code>/enool</code>)
                    </h6>
                    <p className="text-secondary small mb-2">
                      Send registrations from your daycare enrollment form:
                    </p>
                    <div className="bg-light p-2 rounded mb-3 small font-monospace">
                      parent_name • phone • email • child_name • child_age • preferred_program • preferred_start_date • message
                    </div>

                    <h6 className="fw-semibold small text-muted">HTML / JavaScript Snippet for your website:</h6>
                    <pre className="bg-dark text-light p-3 rounded" style={{ fontSize: '12px', maxHeight: '250px', overflowY: 'auto' }}>
{`// Example: Sending from your website enrollment form to /enroll (or /enool)
const enrollmentData = new URLSearchParams({
  parent_name: document.getElementById('parent_name').value,
  phone: document.getElementById('phone').value,
  email: document.getElementById('email').value,
  child_name: document.getElementById('child_name').value,
  child_age: document.getElementById('child_age').value,
  preferred_program: document.getElementById('preferred_program').value,
  preferred_start_date: document.getElementById('start_date').value,
  message: document.getElementById('special_notes').value
});

// Both /enroll and /enool are supported:
fetch('https://your-domain.vercel.app/enroll?' + enrollmentData.toString())
  .then(res => res.json())
  .then(data => {
    console.log('Enrollment registered!', data.enrollment_number);
    alert('Thank you! Your child is registered.');
  })
  .catch(err => console.error(err));`}
                    </pre>
                  </>
                )}
              </div>

              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowScriptModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NON-BLOCKING CUSTOM CONFIRMATION MODAL */}
      {confirmDialog.isOpen && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1060, backdropFilter: 'blur(2px)' }}
          onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
              <div className="modal-header border-0 pb-0 pt-4 px-4">
                <div className="d-flex align-items-center gap-2.5">
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: confirmDialog.confirmVariant === 'danger' ? '#fee2e2' : '#e0e7ff',
                      color: confirmDialog.confirmVariant === 'danger' ? '#dc2626' : '#4338ca',
                      flexShrink: 0
                    }}
                  >
                    <i className={`fas ${confirmDialog.confirmVariant === 'danger' ? 'fa-exclamation-triangle' : 'fa-info-circle'} fs-5`}></i>
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold fs-6 mb-0 text-dark">
                      {confirmDialog.title}
                    </h5>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                ></button>
              </div>
              <div className="modal-body px-4 py-3">
                <p className="text-secondary small mb-0" style={{ lineHeight: 1.6, fontSize: '13.5px' }}>
                  {confirmDialog.message}
                </p>
              </div>
              <div className="modal-footer border-0 px-4 pb-4 pt-1 d-flex justify-content-end gap-2 bg-light-subtle">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className={`btn btn-${confirmDialog.confirmVariant || 'danger'} btn-sm px-3 fw-medium shadow-xs`}
                  onClick={confirmDialog.onConfirm}
                >
                  {confirmDialog.confirmLabel || 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
