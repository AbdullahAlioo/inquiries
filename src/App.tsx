import React, { useState, useEffect, useMemo } from 'react';
import { Inquiry, Enrollment } from './types.ts';

export default function App() {
  // Active Section: 'inquiries' | 'enrollments'
  const [activeSection, setActiveSection] = useState<'inquiries' | 'enrollments'>('inquiries');

  // Data states
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [dealtFilter, setDealtFilter] = useState<'all' | 'pending' | 'dealt'>('all');

  // Sorting
  const [sortCol, setSortCol] = useState<number>(5);
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Responsive View Mode: Table vs Cards
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 992) {
      return 'cards';
    }
    return 'table';
  });

  // UI Toast Alert
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

  // Test Inquiry Form state (5 core fields)
  const [testInqName, setTestInqName] = useState('David Miller');
  const [testInqPhone, setTestInqPhone] = useState('+1 (555) 234-8901');
  const [testInqEmail, setTestInqEmail] = useState('david.miller@example.com');
  const [testInqHelpWith, setTestInqHelpWith] = useState('Schedule a Campus Tour');
  const [testInqMessage, setTestInqMessage] = useState('We are relocating to the area and would like to visit the classrooms next Tuesday.');
  const [testInqSending, setTestInqSending] = useState(false);

  // Test Enrollment Form state
  const [testEnrParent, setTestEnrParent] = useState('Sarah & David Miller');
  const [testEnrPhone, setTestEnrPhone] = useState('+1 (555) 234-8901');
  const [testEnrEmail, setTestEnrEmail] = useState('sarah.miller@example.com');
  const [testEnrChild, setTestEnrChild] = useState('Oliver Miller');
  const [testEnrAge, setTestEnrAge] = useState('2.5 years');
  const [testEnrProgram, setTestEnrProgram] = useState('Toddler Program (Full-Day)');
  const [testEnrDate, setTestEnrDate] = useState('2026-11-01');
  const [testEnrNotes, setTestEnrNotes] = useState('Full-time enrollment. No dietary restrictions.');
  const [testEnrEndpoint, setTestEnrEndpoint] = useState<'/enroll' | '/enool'>('/enroll');
  const [testEnrSending, setTestEnrSending] = useState(false);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (flashMessage) {
      const timer = setTimeout(() => setFlashMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [flashMessage]);

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

      eventSource.addEventListener('inquiry_created', (event) => {
        try {
          const item: Inquiry = JSON.parse(event.data);
          setInquiries(prev => {
            if (prev.some(i => i.id === item.id || i.ticket_number === item.ticket_number)) return prev;
            return [item, ...prev];
          });
          setFlashMessage({
            type: 'info',
            text: `New inquiry from ${item.your_name}`
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

      eventSource.addEventListener('enrollment_created', (event) => {
        try {
          const item: Enrollment = JSON.parse(event.data);
          setEnrollments(prev => {
            if (prev.some(e => e.id === item.id || e.enrollment_number === item.enrollment_number)) return prev;
            return [item, ...prev];
          });
          setFlashMessage({
            type: 'success',
            text: `New enrollment for ${item.child_name || item.parent_name}`
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
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  // Move Inquiry -> Enrollment
  const handleMoveInquiryToEnrollment = async (inq: Inquiry) => {
    try {
      const res = await fetch(`/api/inquiries/${encodeURIComponent(inq.id || inq.ticket_number)}/move_to_enrollments`, {
        method: 'POST'
      });
      if (res.ok) {
        setInquiries(prev => prev.filter(i => i.id !== inq.id && i.ticket_number !== inq.ticket_number));
        setSelectedInquiry(null);
        setFlashMessage({
          type: 'success',
          text: `Moved "${inq.your_name}" to Enrollments.`
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Move Enrollment -> Inquiry
  const handleMoveEnrollmentToInquiry = async (enr: Enrollment) => {
    try {
      const res = await fetch(`/api/enrollments/${encodeURIComponent(enr.id || enr.enrollment_number)}/move_to_inquiries`, {
        method: 'POST'
      });
      if (res.ok) {
        setEnrollments(prev => prev.filter(e => e.id !== enr.id && e.enrollment_number !== enr.enrollment_number));
        setSelectedEnrollment(null);
        setFlashMessage({
          type: 'success',
          text: `Moved "${enr.parent_name}" to Inquiries.`
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Inquiry
  const requestDeleteInquiry = (inq: Inquiry) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Inquiry',
      message: `Permanently delete inquiry from "${inq.your_name}" (${inq.ticket_number})?`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setInquiries(prev => prev.filter(i => i.id !== inq.id && i.ticket_number !== inq.ticket_number));
        if (selectedInquiry?.id === inq.id) setSelectedInquiry(null);
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
      title: 'Delete Enrollment',
      message: `Permanently delete enrollment registration for "${enr.parent_name}" (${enr.enrollment_number})?`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setEnrollments(prev => prev.filter(e => e.id !== enr.id && e.enrollment_number !== enr.enrollment_number));
        if (selectedEnrollment?.id === enr.id) setSelectedEnrollment(null);
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
      title: 'Reset All Data to 0',
      message: 'Clear all inquiries and enrollments? All lists will be reset to zero.',
      confirmLabel: 'Reset to 0',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setInquiries([]);
        setEnrollments([]);
        setSelectedInquiry(null);
        setSelectedEnrollment(null);
        try {
          await fetch('/api/inquiries/clear_all', { method: 'POST' });
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Submit Test Inquiry
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
      const res = await fetch(`/inquiry?${query.toString()}`);
      if (res.ok) {
        setShowTestModal(false);
        setActiveSection('inquiries');
        setFlashMessage({
          type: 'success',
          text: `Inquiry sent successfully to /inquiry!`
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTestInqSending(false);
    }
  };

  // Submit Test Enrollment
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
      const res = await fetch(`${testEnrEndpoint}?${query.toString()}`);
      if (res.ok) {
        setShowTestModal(false);
        setActiveSection('enrollments');
        setFlashMessage({
          type: 'success',
          text: `Enrollment sent successfully to ${testEnrEndpoint}!`
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
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

  // Distinct category choices
  const inquiryCategories = useMemo(() => {
    return Array.from(new Set(inquiries.map(i => i.what_can_we_help_with).filter(Boolean))).sort();
  }, [inquiries]);

  const enrollmentPrograms = useMemo(() => {
    return Array.from(new Set(enrollments.map(e => e.preferred_program).filter(Boolean))).sort();
  }, [enrollments]);

  const inqPending = useMemo(() => inquiries.filter(i => !i.dealt).length, [inquiries]);
  const inqDealt = useMemo(() => inquiries.filter(i => i.dealt).length, [inquiries]);
  const enrPending = useMemo(() => enrollments.filter(e => !e.dealt).length, [enrollments]);
  const enrDealt = useMemo(() => enrollments.filter(e => e.dealt).length, [enrollments]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fcfcfd' }}>
      
      {/* MINIMALIST TOP APP BAR */}
      <header className="border-bottom bg-white" style={{ borderColor: '#f1f5f9' }}>
        <div className="container-fluid px-3 px-md-4 py-2.5 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <div 
              className="d-flex align-items-center justify-content-center rounded-2 bg-dark text-white" 
              style={{ width: '28px', height: '28px', fontSize: '13px' }}
            >
              <i className="fas fa-shapes"></i>
            </div>
            <span className="fw-semibold text-dark fs-6" style={{ letterSpacing: '-0.02em' }}>
              Daycare Desk
            </span>
          </div>

          <div className="d-flex align-items-center gap-1.5">
            <button 
              className="btn btn-sm btn-light border-0 text-secondary px-2.5 py-1"
              onClick={fetchData}
              disabled={isRefreshing}
              title="Refresh"
            >
              <i className={`fas fa-sync-alt ${isRefreshing ? 'fa-spin' : ''}`} style={{ fontSize: '12px' }}></i>
            </button>
            <button
              onClick={() => setShowScriptModal(true)}
              className="btn btn-sm btn-light text-secondary border px-2.5 py-1"
              style={{ fontSize: '12px', borderRadius: '6px' }}
            >
              <i className="fas fa-code me-1" style={{ fontSize: '11px' }}></i>
              Embed Code
            </button>
            <button
              onClick={() => setShowTestModal(true)}
              className="btn btn-sm btn-dark px-3 py-1"
              style={{ fontSize: '12px', borderRadius: '6px' }}
            >
              <i className="fas fa-plus me-1" style={{ fontSize: '10px' }}></i>
              Test Form
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="container-fluid px-3 px-md-4 py-3" style={{ maxWidth: '1280px', flex: '1 0 auto' }}>
        
        {/* Toast Alert */}
        {flashMessage && (
          <div 
            className="alert alert-dismissible fade show border-0 py-2 px-3 mb-3 d-flex align-items-center justify-content-between shadow-xs"
            style={{ 
              backgroundColor: flashMessage.type === 'success' ? '#f0fdf4' : '#eff6ff',
              color: flashMessage.type === 'success' ? '#166534' : '#1e40af',
              fontSize: '13px',
              borderRadius: '8px'
            }}
          >
            <div>
              <i className={`fas ${flashMessage.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'} me-2`}></i>
              {flashMessage.text}
            </div>
            <button type="button" className="btn-close py-2" onClick={() => setFlashMessage(null)}></button>
          </div>
        )}

        {/* SECTION NAVIGATION & METRICS STRIP */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3 pb-2 border-bottom">
          {/* Minimalist Segmented Tabs */}
          <div className="d-inline-flex p-1 rounded-2 bg-light border" style={{ gap: '2px' }}>
            <button
              type="button"
              className={`btn btn-sm border-0 py-1.5 px-3 fw-medium ${
                activeSection === 'inquiries' 
                  ? 'bg-white text-dark shadow-xs' 
                  : 'text-secondary hover:text-dark'
              }`}
              style={{ fontSize: '13px', borderRadius: '5px' }}
              onClick={() => {
                setActiveSection('inquiries');
                setSearchQuery('');
                setFilterCategory('');
              }}
            >
              <span>Inquiries</span>
              <span 
                className="ms-1.5 px-1.5 py-0.5 rounded-pill"
                style={{ 
                  fontSize: '11px',
                  backgroundColor: activeSection === 'inquiries' ? '#0f172a' : '#e2e8f0',
                  color: activeSection === 'inquiries' ? '#ffffff' : '#475569'
                }}
              >
                {inquiries.length}
              </span>
            </button>

            <button
              type="button"
              className={`btn btn-sm border-0 py-1.5 px-3 fw-medium ${
                activeSection === 'enrollments' 
                  ? 'bg-white text-dark shadow-xs' 
                  : 'text-secondary hover:text-dark'
              }`}
              style={{ fontSize: '13px', borderRadius: '5px' }}
              onClick={() => {
                setActiveSection('enrollments');
                setSearchQuery('');
                setFilterCategory('');
              }}
            >
              <span>Enrollments</span>
              <span 
                className="ms-1.5 px-1.5 py-0.5 rounded-pill"
                style={{ 
                  fontSize: '11px',
                  backgroundColor: activeSection === 'enrollments' ? '#0f172a' : '#e2e8f0',
                  color: activeSection === 'enrollments' ? '#ffffff' : '#475569'
                }}
              >
                {enrollments.length}
              </span>
            </button>
          </div>

          {/* Minimalist Metrics Strip */}
          <div className="d-flex align-items-center gap-3 text-secondary small">
            {activeSection === 'inquiries' ? (
              <>
                <div>Total: <strong className="text-dark">{inquiries.length}</strong></div>
                <div className="vr my-1"></div>
                <div className="d-flex align-items-center gap-1">
                  <span className="rounded-circle bg-warning d-inline-block" style={{ width: '7px', height: '7px' }}></span>
                  <span>Pending: <strong className="text-dark">{inqPending}</strong></span>
                </div>
                <div className="vr my-1"></div>
                <div className="d-flex align-items-center gap-1">
                  <span className="rounded-circle bg-success d-inline-block" style={{ width: '7px', height: '7px' }}></span>
                  <span>Resolved: <strong className="text-dark">{inqDealt}</strong></span>
                </div>
              </>
            ) : (
              <>
                <div>Total: <strong className="text-dark">{enrollments.length}</strong></div>
                <div className="vr my-1"></div>
                <div className="d-flex align-items-center gap-1">
                  <span className="rounded-circle bg-warning d-inline-block" style={{ width: '7px', height: '7px' }}></span>
                  <span>Pending: <strong className="text-dark">{enrPending}</strong></span>
                </div>
                <div className="vr my-1"></div>
                <div className="d-flex align-items-center gap-1">
                  <span className="rounded-circle bg-success d-inline-block" style={{ width: '7px', height: '7px' }}></span>
                  <span>Confirmed: <strong className="text-dark">{enrDealt}</strong></span>
                </div>
              </>
            )}

            {/* Quick Export & Reset */}
            <div className="ms-2 d-flex align-items-center gap-1">
              {(activeSection === 'inquiries' ? inquiries.length > 0 : enrollments.length > 0) && (
                <a 
                  href={activeSection === 'inquiries' ? '/export_inquiries' : '/export_enrollments'}
                  className="btn btn-sm btn-link text-secondary p-0 text-decoration-none"
                  style={{ fontSize: '12px' }}
                  title="Export to CSV"
                >
                  <i className="fas fa-download me-1"></i> Export
                </a>
              )}
              {(inquiries.length > 0 || enrollments.length > 0) && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger p-0 ms-2 text-decoration-none"
                  style={{ fontSize: '12px' }}
                  onClick={requestResetAll}
                  title="Reset to 0"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CONTROLS TOOLBAR: Search, Category, Status Filter, View Toggle */}
        <div className="row g-2 mb-3 align-items-center">
          {/* Search Input */}
          <div className="col-12 col-md-5">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0 text-muted" style={{ borderRadius: '6px 0 0 6px' }}>
                <i className="fas fa-search" style={{ fontSize: '11px' }}></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                style={{ borderRadius: '0 6px 6px 0', fontSize: '13px' }}
                placeholder={activeSection === 'inquiries' ? 'Search by name, phone, email, topic...' : 'Search parent, child, program, notes...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="btn btn-outline-secondary" type="button" onClick={() => setSearchQuery('')}>
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="col-6 col-md-3">
            <select
              className="form-select form-select-sm"
              style={{ fontSize: '12.5px', borderRadius: '6px' }}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              {activeSection === 'inquiries' ? (
                <>
                  <option value="">All Topics ({inquiryCategories.length})</option>
                  {inquiryCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </>
              ) : (
                <>
                  <option value="">All Programs ({enrollmentPrograms.length})</option>
                  {enrollmentPrograms.map(prog => <option key={prog} value={prog}>{prog}</option>)}
                </>
              )}
            </select>
          </div>

          {/* Status Filter: All / Pending / Done */}
          <div className="col-6 col-md-4 d-flex justify-content-end align-items-center gap-2">
            <div className="btn-group btn-group-sm" role="group">
              <button
                type="button"
                className={`btn py-1 px-2.5 ${dealtFilter === 'all' ? 'btn-dark' : 'btn-outline-secondary'}`}
                style={{ fontSize: '12px' }}
                onClick={() => setDealtFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`btn py-1 px-2.5 ${dealtFilter === 'pending' ? 'btn-dark' : 'btn-outline-secondary'}`}
                style={{ fontSize: '12px' }}
                onClick={() => setDealtFilter('pending')}
              >
                Pending
              </button>
              <button
                type="button"
                className={`btn py-1 px-2.5 ${dealtFilter === 'dealt' ? 'btn-dark' : 'btn-outline-secondary'}`}
                style={{ fontSize: '12px' }}
                onClick={() => setDealtFilter('dealt')}
              >
                Done
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="btn-group btn-group-sm" role="group">
              <button
                type="button"
                className={`btn py-1 px-2 ${viewMode === 'table' ? 'btn-secondary text-white' : 'btn-outline-secondary'}`}
                style={{ fontSize: '12px' }}
                onClick={() => setViewMode('table')}
                title="Table view"
              >
                <i className="fas fa-table"></i>
              </button>
              <button
                type="button"
                className={`btn py-1 px-2 ${viewMode === 'cards' ? 'btn-secondary text-white' : 'btn-outline-secondary'}`}
                style={{ fontSize: '12px' }}
                onClick={() => setViewMode('cards')}
                title="Card view"
              >
                <i className="fas fa-th-large"></i>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 1: INQUIRIES VIEW */}
        {activeSection === 'inquiries' && (
          <div>
            {inquiries.length === 0 ? (
              <div className="text-center py-5 bg-white rounded-3 border" style={{ borderColor: '#f1f5f9' }}>
                <div className="mb-2 text-muted" style={{ opacity: 0.4 }}>
                  <i className="fas fa-inbox fa-2x"></i>
                </div>
                <h6 className="fw-semibold text-dark mb-1">No inquiries yet</h6>
                <p className="text-muted small mb-3">
                  Messages submitted to <code>/inquiry</code> with the 5 parameters will appear here.
                </p>
                <button
                  onClick={() => {
                    setTestModalTab('inquiry');
                    setShowTestModal(true);
                  }}
                  className="btn btn-sm btn-dark px-3 py-1.5"
                  style={{ borderRadius: '6px', fontSize: '12.5px' }}
                >
                  <i className="fas fa-paper-plane me-1"></i> Send Sample Inquiry
                </button>
              </div>
            ) : viewMode === 'table' ? (
              /* CLEAN MINIMALIST TABLE: INQUIRIES */
              <div className="bg-white rounded-3 border shadow-xs overflow-hidden" style={{ borderColor: '#f1f5f9' }}>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ minWidth: '920px', fontSize: '13px' }}>
                    <thead>
                      <tr className="bg-light" style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ width: '95px', minWidth: '95px', textAlign: 'center', whiteSpace: 'nowrap' }} onClick={() => handleSort(0)}>
                          Status <i className="fas fa-sort text-muted ms-1" style={{ fontSize: '10px' }}></i>
                        </th>
                        <th style={{ minWidth: '160px', whiteSpace: 'nowrap' }} onClick={() => handleSort(1)}>
                          Your Name <i className="fas fa-sort text-muted ms-1" style={{ fontSize: '10px' }}></i>
                        </th>
                        <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }} onClick={() => handleSort(2)}>
                          Phone <i className="fas fa-sort text-muted ms-1" style={{ fontSize: '10px' }}></i>
                        </th>
                        <th style={{ minWidth: '170px' }} onClick={() => handleSort(3)}>
                          Email Address <i className="fas fa-sort text-muted ms-1" style={{ fontSize: '10px' }}></i>
                        </th>
                        <th style={{ minWidth: '170px', whiteSpace: 'nowrap' }} onClick={() => handleSort(4)}>
                          What Can We Help With? <i className="fas fa-sort text-muted ms-1" style={{ fontSize: '10px' }}></i>
                        </th>
                        <th style={{ minWidth: '220px' }}>Your Message</th>
                        <th style={{ width: '110px', minWidth: '110px', whiteSpace: 'nowrap' }} onClick={() => handleSort(5)}>
                          Date <i className="fas fa-sort text-muted ms-1" style={{ fontSize: '10px' }}></i>
                        </th>
                        <th style={{ width: '80px', minWidth: '80px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedInquiries.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-4 text-muted small">
                            No inquiries match your filter.
                          </td>
                        </tr>
                      ) : (
                        sortedInquiries.map((inq) => (
                          <tr
                            key={inq.id}
                            style={{ cursor: 'pointer', backgroundColor: inq.dealt ? '#fcfdfd' : '#ffffff' }}
                            onClick={() => setSelectedInquiry(inq)}
                          >
                            {/* Status Toggle */}
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleToggleInquiryDealt(inq.id, !inq.dealt)}
                                className="btn btn-sm border-0 py-0.5 px-2"
                                style={{
                                  backgroundColor: inq.dealt ? '#ecfdf5' : '#fef3c7',
                                  color: inq.dealt ? '#065f46' : '#92400e',
                                  fontSize: '11.5px',
                                  fontWeight: 500,
                                  borderRadius: '12px'
                                }}
                                title="Click to toggle Done / Pending"
                              >
                                {inq.dealt ? '✓ Done' : '○ Pending'}
                              </button>
                            </td>

                            {/* Name */}
                            <td>
                              <span className="fw-semibold text-dark">{inq.your_name}</span>
                              <div className="text-muted font-monospace" style={{ fontSize: '10.5px' }}>
                                {inq.ticket_number}
                              </div>
                            </td>

                            {/* Phone */}
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {inq.phone ? (
                                <a 
                                  href={`tel:${inq.phone}`} 
                                  onClick={(e) => e.stopPropagation()} 
                                  className="text-decoration-none text-dark"
                                >
                                  {inq.phone}
                                </a>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>

                            {/* Email */}
                            <td style={{ wordBreak: 'break-all' }}>
                              <a 
                                href={`mailto:${inq.email}`} 
                                onClick={(e) => e.stopPropagation()} 
                                className="text-decoration-none text-secondary"
                              >
                                {inq.email}
                              </a>
                            </td>

                            {/* Topic */}
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <span className="badge bg-light text-dark border fw-normal" style={{ fontSize: '11.5px' }}>
                                {inq.what_can_we_help_with}
                              </span>
                            </td>

                            {/* Message */}
                            <td style={{ maxWidth: '240px' }}>
                              <div className="text-truncate text-secondary small" title={inq.your_message || ''}>
                                {inq.your_message || <em className="text-muted">No message</em>}
                              </div>
                            </td>

                            {/* Date */}
                            <td style={{ whiteSpace: 'nowrap', fontSize: '11.5px', color: '#64748b' }}>
                              {inq.timestamp ? inq.timestamp.slice(5, 16) : ''}
                            </td>

                            {/* Actions */}
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                              <div className="d-flex justify-content-center gap-1">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-light border-0 text-muted p-1"
                                  onClick={() => setSelectedInquiry(inq)}
                                  title="View details"
                                >
                                  <i className="fas fa-eye" style={{ fontSize: '12px' }}></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-light border-0 text-danger p-1"
                                  onClick={() => requestDeleteInquiry(inq)}
                                  title="Delete"
                                >
                                  <i className="fas fa-trash-alt" style={{ fontSize: '12px' }}></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* CLEAN MINIMALIST CARDS: INQUIRIES */
              <div className="row g-2.5">
                {sortedInquiries.map((inq) => (
                  <div key={inq.id} className="col-12 col-md-6 col-xl-4">
                    <div 
                      className="bg-white p-3 rounded-3 border shadow-xs h-100 d-flex flex-column justify-content-between"
                      style={{ borderColor: '#f1f5f9' }}
                    >
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <button
                            type="button"
                            onClick={() => handleToggleInquiryDealt(inq.id, !inq.dealt)}
                            className="btn btn-sm border-0 py-0.5 px-2"
                            style={{
                              backgroundColor: inq.dealt ? '#ecfdf5' : '#fef3c7',
                              color: inq.dealt ? '#065f46' : '#92400e',
                              fontSize: '11.5px',
                              fontWeight: 500,
                              borderRadius: '12px'
                            }}
                          >
                            {inq.dealt ? '✓ Done' : '○ Pending'}
                          </button>
                          <span className="text-muted font-monospace" style={{ fontSize: '11px' }}>
                            {inq.ticket_number}
                          </span>
                        </div>

                        <h6 className="fw-bold text-dark mb-1">{inq.your_name}</h6>
                        
                        <div className="mb-2">
                          <span className="badge bg-light text-dark border fw-normal" style={{ fontSize: '11px' }}>
                            {inq.what_can_we_help_with}
                          </span>
                        </div>

                        <div className="small mb-2 text-secondary">
                          {inq.phone && (
                            <div>
                              <a href={`tel:${inq.phone}`} className="text-decoration-none text-dark">
                                <i className="fas fa-phone-alt me-1 text-muted" style={{ fontSize: '10px' }}></i>
                                {inq.phone}
                              </a>
                            </div>
                          )}
                          <div className="text-truncate">
                            <a href={`mailto:${inq.email}`} className="text-decoration-none text-secondary">
                              <i className="fas fa-envelope me-1 text-muted" style={{ fontSize: '10px' }}></i>
                              {inq.email}
                            </a>
                          </div>
                        </div>

                        {inq.your_message && (
                          <div className="p-2 rounded bg-light small text-secondary text-truncate mb-2" style={{ fontSize: '12px' }}>
                            {inq.your_message}
                          </div>
                        )}
                      </div>

                      <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                        <small className="text-muted" style={{ fontSize: '11px' }}>
                          {inq.timestamp ? inq.timestamp.slice(5, 16) : ''}
                        </small>
                        <div className="d-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border text-secondary px-2 py-0.5"
                            style={{ fontSize: '11.5px', borderRadius: '4px' }}
                            onClick={() => setSelectedInquiry(inq)}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-light border-0 text-danger p-1"
                            onClick={() => requestDeleteInquiry(inq)}
                          >
                            <i className="fas fa-trash-alt" style={{ fontSize: '11px' }}></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: ENROLLMENTS VIEW */}
        {activeSection === 'enrollments' && (
          <div>
            {enrollments.length === 0 ? (
              <div className="text-center py-5 bg-white rounded-3 border" style={{ borderColor: '#f1f5f9' }}>
                <div className="mb-2 text-muted" style={{ opacity: 0.4 }}>
                  <i className="fas fa-user-graduate fa-2x"></i>
                </div>
                <h6 className="fw-semibold text-dark mb-1">No enrollments yet</h6>
                <p className="text-muted small mb-3">
                  Registrations submitted to <code>/enroll</code> (or <code>/enool</code>) will appear here.
                </p>
                <button
                  onClick={() => {
                    setTestModalTab('enrollment');
                    setShowTestModal(true);
                  }}
                  className="btn btn-sm btn-dark px-3 py-1.5"
                  style={{ borderRadius: '6px', fontSize: '12.5px' }}
                >
                  <i className="fas fa-paper-plane me-1"></i> Send Sample Enrollment
                </button>
              </div>
            ) : viewMode === 'table' ? (
              /* CLEAN MINIMALIST TABLE: ENROLLMENTS */
              <div className="bg-white rounded-3 border shadow-xs overflow-hidden" style={{ borderColor: '#f1f5f9' }}>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ minWidth: '1050px', fontSize: '13px' }}>
                    <thead>
                      <tr className="bg-light" style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ width: '95px', minWidth: '95px', textAlign: 'center', whiteSpace: 'nowrap' }} onClick={() => handleSort(0)}>
                          Status <i className="fas fa-sort text-muted ms-1" style={{ fontSize: '10px' }}></i>
                        </th>
                        <th style={{ minWidth: '160px', whiteSpace: 'nowrap' }} onClick={() => handleSort(1)}>
                          Parent / Guardian <i className="fas fa-sort text-muted ms-1" style={{ fontSize: '10px' }}></i>
                        </th>
                        <th style={{ minWidth: '150px', whiteSpace: 'nowrap' }} onClick={() => handleSort(2)}>
                          Child & Age <i className="fas fa-sort text-muted ms-1" style={{ fontSize: '10px' }}></i>
                        </th>
                        <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }} onClick={() => handleSort(3)}>
                          Phone <i className="fas fa-sort text-muted ms-1" style={{ fontSize: '10px' }}></i>
                        </th>
                        <th style={{ minWidth: '170px' }} onClick={() => handleSort(4)}>
                          Email Address <i className="fas fa-sort text-muted ms-1" style={{ fontSize: '10px' }}></i>
                        </th>
                        <th style={{ minWidth: '170px', whiteSpace: 'nowrap' }} onClick={() => handleSort(5)}>
                          Program <i className="fas fa-sort text-muted ms-1" style={{ fontSize: '10px' }}></i>
                        </th>
                        <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }} onClick={() => handleSort(6)}>
                          Start Date <i className="fas fa-sort text-muted ms-1" style={{ fontSize: '10px' }}></i>
                        </th>
                        <th style={{ minWidth: '200px' }}>Notes / Message</th>
                        <th style={{ width: '80px', minWidth: '80px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEnrollments.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-4 text-muted small">
                            No enrollments match your filter.
                          </td>
                        </tr>
                      ) : (
                        sortedEnrollments.map((enr) => (
                          <tr
                            key={enr.id}
                            style={{ cursor: 'pointer', backgroundColor: enr.dealt ? '#fcfdfd' : '#ffffff' }}
                            onClick={() => setSelectedEnrollment(enr)}
                          >
                            {/* Status Toggle */}
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleToggleEnrollmentDealt(enr.id, !enr.dealt)}
                                className="btn btn-sm border-0 py-0.5 px-2"
                                style={{
                                  backgroundColor: enr.dealt ? '#ecfdf5' : '#fef3c7',
                                  color: enr.dealt ? '#065f46' : '#92400e',
                                  fontSize: '11.5px',
                                  fontWeight: 500,
                                  borderRadius: '12px'
                                }}
                                title="Click to toggle Done / Pending"
                              >
                                {enr.dealt ? '✓ Done' : '○ Pending'}
                              </button>
                            </td>

                            {/* Parent */}
                            <td>
                              <span className="fw-semibold text-dark">{enr.parent_name}</span>
                              <div className="text-muted font-monospace" style={{ fontSize: '10.5px' }}>
                                {enr.enrollment_number}
                              </div>
                            </td>

                            {/* Child & Age */}
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {enr.child_name ? (
                                <div className="d-flex align-items-center gap-1">
                                  <span>{enr.child_name}</span>
                                  {enr.child_age && (
                                    <span className="badge bg-light text-secondary border fw-normal" style={{ fontSize: '10.5px' }}>
                                      {enr.child_age}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted small">-</span>
                              )}
                            </td>

                            {/* Phone */}
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {enr.phone ? (
                                <a 
                                  href={`tel:${enr.phone}`} 
                                  onClick={(e) => e.stopPropagation()} 
                                  className="text-decoration-none text-dark"
                                >
                                  {enr.phone}
                                </a>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>

                            {/* Email */}
                            <td style={{ wordBreak: 'break-all' }}>
                              <a 
                                href={`mailto:${enr.email}`} 
                                onClick={(e) => e.stopPropagation()} 
                                className="text-decoration-none text-secondary"
                              >
                                {enr.email}
                              </a>
                            </td>

                            {/* Program */}
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <span className="badge bg-light text-dark border fw-normal" style={{ fontSize: '11.5px' }}>
                                {enr.preferred_program}
                              </span>
                            </td>

                            {/* Start Date */}
                            <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                              {enr.preferred_start_date || 'Flexible'}
                            </td>

                            {/* Message */}
                            <td style={{ maxWidth: '240px' }}>
                              <div className="text-truncate text-secondary small" title={enr.message || ''}>
                                {enr.message || <em className="text-muted">No notes</em>}
                              </div>
                            </td>

                            {/* Actions */}
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                              <div className="d-flex justify-content-center gap-1">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-light border-0 text-muted p-1"
                                  onClick={() => setSelectedEnrollment(enr)}
                                  title="View details"
                                >
                                  <i className="fas fa-eye" style={{ fontSize: '12px' }}></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-light border-0 text-danger p-1"
                                  onClick={() => requestDeleteEnrollment(enr)}
                                  title="Delete"
                                >
                                  <i className="fas fa-trash-alt" style={{ fontSize: '12px' }}></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* CLEAN MINIMALIST CARDS: ENROLLMENTS */
              <div className="row g-2.5">
                {sortedEnrollments.map((enr) => (
                  <div key={enr.id} className="col-12 col-md-6 col-xl-4">
                    <div 
                      className="bg-white p-3 rounded-3 border shadow-xs h-100 d-flex flex-column justify-content-between"
                      style={{ borderColor: '#f1f5f9' }}
                    >
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <button
                            type="button"
                            onClick={() => handleToggleEnrollmentDealt(enr.id, !enr.dealt)}
                            className="btn btn-sm border-0 py-0.5 px-2"
                            style={{
                              backgroundColor: enr.dealt ? '#ecfdf5' : '#fef3c7',
                              color: enr.dealt ? '#065f46' : '#92400e',
                              fontSize: '11.5px',
                              fontWeight: 500,
                              borderRadius: '12px'
                            }}
                          >
                            {enr.dealt ? '✓ Done' : '○ Pending'}
                          </button>
                          <span className="text-muted font-monospace" style={{ fontSize: '11px' }}>
                            {enr.enrollment_number}
                          </span>
                        </div>

                        <h6 className="fw-bold text-dark mb-1">{enr.parent_name}</h6>
                        
                        <div className="d-flex align-items-center gap-1 mb-2">
                          <span className="badge bg-light text-dark border fw-normal" style={{ fontSize: '11px' }}>
                            Child: {enr.child_name || 'N/A'} {enr.child_age ? `(${enr.child_age})` : ''}
                          </span>
                        </div>

                        <div className="small mb-2 text-secondary">
                          <div className="mb-0.5">
                            <span className="text-muted">Program:</span> <strong>{enr.preferred_program}</strong>
                          </div>
                          <div>
                            <span className="text-muted">Start:</span> {enr.preferred_start_date || 'Flexible'}
                          </div>
                        </div>

                        <div className="small mb-2 text-secondary">
                          {enr.phone && (
                            <div>
                              <a href={`tel:${enr.phone}`} className="text-decoration-none text-dark">
                                <i className="fas fa-phone-alt me-1 text-muted" style={{ fontSize: '10px' }}></i>
                                {enr.phone}
                              </a>
                            </div>
                          )}
                          <div className="text-truncate">
                            <a href={`mailto:${enr.email}`} className="text-decoration-none text-secondary">
                              <i className="fas fa-envelope me-1 text-muted" style={{ fontSize: '10px' }}></i>
                              {enr.email}
                            </a>
                          </div>
                        </div>

                        {enr.message && (
                          <div className="p-2 rounded bg-light small text-secondary text-truncate mb-2" style={{ fontSize: '12px' }}>
                            {enr.message}
                          </div>
                        )}
                      </div>

                      <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                        <small className="text-muted" style={{ fontSize: '11px' }}>
                          {enr.timestamp ? enr.timestamp.slice(5, 16) : ''}
                        </small>
                        <div className="d-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border text-secondary px-2 py-0.5"
                            style={{ fontSize: '11.5px', borderRadius: '4px' }}
                            onClick={() => setSelectedEnrollment(enr)}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-light border-0 text-danger p-1"
                            onClick={() => requestDeleteEnrollment(enr)}
                          >
                            <i className="fas fa-trash-alt" style={{ fontSize: '11px' }}></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* MINIMALIST FOOTER */}
      <footer className="py-2.5 border-top bg-white text-center text-muted" style={{ fontSize: '11.5px' }}>
        <span>Daycare Desk • Endpoints: <code>/inquiry</code> & <code>/enroll</code></span>
      </footer>

      {/* MODAL: INQUIRY DETAILS */}
      {selectedInquiry && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 1050 }}
          onClick={() => setSelectedInquiry(null)}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px' }}>
              <div className="modal-header border-bottom py-2.5 px-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-semibold fs-6">Inquiry Details</span>
                  <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: '10.5px' }}>
                    {selectedInquiry.ticket_number}
                  </span>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelectedInquiry(null)}></button>
              </div>

              <div className="modal-body p-3">
                <div className="d-flex justify-content-between align-items-center mb-3 p-2 rounded bg-light">
                  <span className="small text-secondary">
                    Status: <strong>{selectedInquiry.dealt ? 'Resolved' : 'Pending'}</strong>
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-white border px-2 py-0.5"
                    style={{ fontSize: '12px' }}
                    onClick={() => handleToggleInquiryDealt(selectedInquiry.id, !selectedInquiry.dealt)}
                  >
                    {selectedInquiry.dealt ? 'Mark Pending' : 'Mark as Done ✓'}
                  </button>
                </div>

                <div className="mb-2.5">
                  <span className="text-muted d-block" style={{ fontSize: '11px' }}>Your name</span>
                  <strong className="fs-6 text-dark">{selectedInquiry.your_name}</strong>
                </div>

                <div className="row g-2 mb-2.5">
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>Phone number</span>
                    {selectedInquiry.phone ? (
                      <a href={`tel:${selectedInquiry.phone}`} className="text-decoration-none fw-medium text-dark">
                        {selectedInquiry.phone}
                      </a>
                    ) : (
                      <span className="text-muted small">-</span>
                    )}
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>Email address</span>
                    <a href={`mailto:${selectedInquiry.email}`} className="text-decoration-none fw-medium text-dark text-truncate d-block">
                      {selectedInquiry.email}
                    </a>
                  </div>
                </div>

                <div className="mb-2.5">
                  <span className="text-muted d-block" style={{ fontSize: '11px' }}>What can we help with?</span>
                  <span className="badge bg-light text-dark border fw-normal" style={{ fontSize: '12px' }}>
                    {selectedInquiry.what_can_we_help_with}
                  </span>
                </div>

                <div className="mb-2.5">
                  <span className="text-muted d-block" style={{ fontSize: '11px' }}>Your message</span>
                  <div className="p-2.5 rounded bg-light border small text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedInquiry.your_message || <em className="text-muted">No message provided.</em>}
                  </div>
                </div>

                {/* Move to Enrollments button */}
                <div className="pt-2 border-top d-flex justify-content-between align-items-center">
                  <span className="text-muted small" style={{ fontSize: '11px' }}>Wrong section?</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-1 px-2"
                    style={{ fontSize: '11.5px' }}
                    onClick={() => handleMoveInquiryToEnrollment(selectedInquiry)}
                  >
                    <i className="fas fa-arrow-right me-1"></i> Move to Enrollments
                  </button>
                </div>
              </div>

              <div className="modal-footer border-top py-2 px-3 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger text-decoration-none p-0"
                  onClick={() => requestDeleteInquiry(selectedInquiry)}
                >
                  <i className="fas fa-trash-alt me-1"></i> Delete
                </button>
                <div className="d-flex gap-1.5">
                  {selectedInquiry.phone && (
                    <a href={`tel:${selectedInquiry.phone}`} className="btn btn-sm btn-outline-success px-2.5 py-1">
                      Call
                    </a>
                  )}
                  <a href={`mailto:${selectedInquiry.email}`} className="btn btn-sm btn-dark px-2.5 py-1">
                    Email
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ENROLLMENT DETAILS */}
      {selectedEnrollment && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 1050 }}
          onClick={() => setSelectedEnrollment(null)}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px' }}>
              <div className="modal-header border-bottom py-2.5 px-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-semibold fs-6">Enrollment Details</span>
                  <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: '10.5px' }}>
                    {selectedEnrollment.enrollment_number}
                  </span>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelectedEnrollment(null)}></button>
              </div>

              <div className="modal-body p-3">
                <div className="d-flex justify-content-between align-items-center mb-3 p-2 rounded bg-light">
                  <span className="small text-secondary">
                    Status: <strong>{selectedEnrollment.dealt ? 'Confirmed' : 'Pending'}</strong>
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-white border px-2 py-0.5"
                    style={{ fontSize: '12px' }}
                    onClick={() => handleToggleEnrollmentDealt(selectedEnrollment.id, !selectedEnrollment.dealt)}
                  >
                    {selectedEnrollment.dealt ? 'Mark Pending' : 'Mark Confirmed ✓'}
                  </button>
                </div>

                <div className="mb-2.5">
                  <span className="text-muted d-block" style={{ fontSize: '11px' }}>Parent / Guardian</span>
                  <strong className="fs-6 text-dark">{selectedEnrollment.parent_name}</strong>
                </div>

                <div className="row g-2 mb-2.5">
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>Child Name</span>
                    <strong className="text-dark">{selectedEnrollment.child_name || '-'}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>Child Age</span>
                    <span>{selectedEnrollment.child_age || '-'}</span>
                  </div>
                </div>

                <div className="row g-2 mb-2.5">
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>Phone</span>
                    {selectedEnrollment.phone ? (
                      <a href={`tel:${selectedEnrollment.phone}`} className="text-decoration-none text-dark">
                        {selectedEnrollment.phone}
                      </a>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>Email</span>
                    <a href={`mailto:${selectedEnrollment.email}`} className="text-decoration-none text-dark text-truncate d-block">
                      {selectedEnrollment.email}
                    </a>
                  </div>
                </div>

                <div className="row g-2 mb-2.5">
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>Program</span>
                    <span className="badge bg-light text-dark border fw-normal">{selectedEnrollment.preferred_program}</span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>Start Date</span>
                    <span>{selectedEnrollment.preferred_start_date || 'Flexible'}</span>
                  </div>
                </div>

                <div className="mb-2.5">
                  <span className="text-muted d-block" style={{ fontSize: '11px' }}>Notes / Message</span>
                  <div className="p-2 rounded bg-light border small text-dark">
                    {selectedEnrollment.message || <em className="text-muted">No notes</em>}
                  </div>
                </div>

                {/* Move to Inquiries button */}
                <div className="pt-2 border-top d-flex justify-content-between align-items-center">
                  <span className="text-muted small" style={{ fontSize: '11px' }}>General question instead?</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-1 px-2"
                    style={{ fontSize: '11.5px' }}
                    onClick={() => handleMoveEnrollmentToInquiry(selectedEnrollment)}
                  >
                    <i className="fas fa-arrow-left me-1"></i> Move to Inquiries
                  </button>
                </div>
              </div>

              <div className="modal-footer border-top py-2 px-3 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger text-decoration-none p-0"
                  onClick={() => requestDeleteEnrollment(selectedEnrollment)}
                >
                  <i className="fas fa-trash-alt me-1"></i> Delete
                </button>
                <div className="d-flex gap-1.5">
                  {selectedEnrollment.phone && (
                    <a href={`tel:${selectedEnrollment.phone}`} className="btn btn-sm btn-outline-success px-2.5 py-1">
                      Call
                    </a>
                  )}
                  <a href={`mailto:${selectedEnrollment.email}`} className="btn btn-sm btn-dark px-2.5 py-1">
                    Email
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TEST FORM SIMULATOR */}
      {showTestModal && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 1050 }}
          onClick={() => setShowTestModal(false)}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px' }}>
              <div className="modal-header border-bottom py-2.5 px-3">
                <span className="fw-semibold fs-6">Submit Test Form</span>
                <button type="button" className="btn-close" onClick={() => setShowTestModal(false)}></button>
              </div>

              <div className="px-3 pt-2 pb-1 border-bottom bg-light d-flex gap-1.5">
                <button
                  type="button"
                  className={`btn btn-sm ${testModalTab === 'inquiry' ? 'btn-white shadow-xs fw-medium text-dark' : 'btn-link text-secondary text-decoration-none'}`}
                  style={{ fontSize: '12px' }}
                  onClick={() => setTestModalTab('inquiry')}
                >
                  Inquiry (/inquiry)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${testModalTab === 'enrollment' ? 'btn-white shadow-xs fw-medium text-dark' : 'btn-link text-secondary text-decoration-none'}`}
                  style={{ fontSize: '12px' }}
                  onClick={() => setTestModalTab('enrollment')}
                >
                  Enrollment (/enroll)
                </button>
              </div>

              <div className="modal-body p-3">
                {testModalTab === 'inquiry' ? (
                  <form onSubmit={handleSendTestInquiry}>
                    <div className="row g-2 mb-2">
                      <div className="col-12">
                        <label className="text-muted small d-block mb-1">Your name</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          required
                          value={testInqName}
                          onChange={(e) => setTestInqName(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="text-muted small d-block mb-1">Phone number</label>
                        <input
                          type="tel"
                          className="form-control form-control-sm"
                          value={testInqPhone}
                          onChange={(e) => setTestInqPhone(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="text-muted small d-block mb-1">Email address</label>
                        <input
                          type="email"
                          className="form-control form-control-sm"
                          required
                          value={testInqEmail}
                          onChange={(e) => setTestInqEmail(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="text-muted small d-block mb-1">What can we help with?</label>
                        <select
                          className="form-select form-select-sm"
                          value={testInqHelpWith}
                          onChange={(e) => setTestInqHelpWith(e.target.value)}
                        >
                          <option value="Schedule a Campus Tour">Schedule a Campus Tour</option>
                          <option value="Tuition & Fee Structure">Tuition & Fee Structure</option>
                          <option value="Infant Program Availability">Infant Program Availability</option>
                          <option value="General Question">General Question</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="text-muted small d-block mb-1">Your message</label>
                        <textarea
                          className="form-control form-control-sm"
                          rows={2}
                          value={testInqMessage}
                          onChange={(e) => setTestInqMessage(e.target.value)}
                        ></textarea>
                      </div>
                    </div>
                    <div className="d-flex justify-content-end gap-1.5 pt-2">
                      <button type="button" className="btn btn-sm btn-light border" onClick={() => setShowTestModal(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-sm btn-dark" disabled={testInqSending}>
                        {testInqSending ? 'Sending...' : 'Send to /inquiry'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSendTestEnrollment}>
                    <div className="row g-2 mb-2">
                      <div className="col-12">
                        <label className="text-muted small d-block mb-1">Parent or guardian name</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          required
                          value={testEnrParent}
                          onChange={(e) => setTestEnrParent(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="text-muted small d-block mb-1">Child's name</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={testEnrChild}
                          onChange={(e) => setTestEnrChild(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="text-muted small d-block mb-1">Child's age</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={testEnrAge}
                          onChange={(e) => setTestEnrAge(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="text-muted small d-block mb-1">Phone</label>
                        <input
                          type="tel"
                          className="form-control form-control-sm"
                          value={testEnrPhone}
                          onChange={(e) => setTestEnrPhone(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="text-muted small d-block mb-1">Email</label>
                        <input
                          type="email"
                          className="form-control form-control-sm"
                          required
                          value={testEnrEmail}
                          onChange={(e) => setTestEnrEmail(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="text-muted small d-block mb-1">Program</label>
                        <select
                          className="form-select form-select-sm"
                          value={testEnrProgram}
                          onChange={(e) => setTestEnrProgram(e.target.value)}
                        >
                          <option value="Toddler Program (Full-Day)">Toddler Program (Full-Day)</option>
                          <option value="Infant Care (0 - 18 mos)">Infant Care (0 - 18 mos)</option>
                          <option value="Pre-K Early Learning">Pre-K Early Learning</option>
                        </select>
                      </div>
                      <div className="col-6">
                        <label className="text-muted small d-block mb-1">Start Date</label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={testEnrDate}
                          onChange={(e) => setTestEnrDate(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="text-muted small d-block mb-1">Notes / Special requirements</label>
                        <textarea
                          className="form-control form-control-sm"
                          rows={2}
                          value={testEnrNotes}
                          onChange={(e) => setTestEnrNotes(e.target.value)}
                        ></textarea>
                      </div>
                    </div>
                    <div className="d-flex justify-content-end gap-1.5 pt-2">
                      <button type="button" className="btn btn-sm btn-light border" onClick={() => setShowTestModal(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-sm btn-dark" disabled={testEnrSending}>
                        {testEnrSending ? 'Sending...' : 'Send to /enroll'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WEBSITE EMBED CODE */}
      {showScriptModal && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 1050 }}
          onClick={() => setShowScriptModal(false)}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px' }}>
              <div className="modal-header border-bottom py-2.5 px-3">
                <span className="fw-semibold fs-6">Website Form Endpoints</span>
                <button type="button" className="btn-close" onClick={() => setShowScriptModal(false)}></button>
              </div>

              <div className="px-3 pt-2 pb-1 border-bottom bg-light d-flex gap-1.5">
                <button
                  type="button"
                  className={`btn btn-sm ${scriptModalTab === 'inquiry' ? 'btn-white shadow-xs fw-medium text-dark' : 'btn-link text-secondary text-decoration-none'}`}
                  style={{ fontSize: '12px' }}
                  onClick={() => setScriptModalTab('inquiry')}
                >
                  Inquiry (/inquiry)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${scriptModalTab === 'enrollment' ? 'btn-white shadow-xs fw-medium text-dark' : 'btn-link text-secondary text-decoration-none'}`}
                  style={{ fontSize: '12px' }}
                  onClick={() => setScriptModalTab('enrollment')}
                >
                  Enrollment (/enroll)
                </button>
              </div>

              <div className="modal-body p-3">
                {scriptModalTab === 'inquiry' ? (
                  <>
                    <p className="text-secondary small mb-2">
                      Send your website's contact form to <code>/inquiry</code> with these 5 parameters:
                    </p>
                    <pre className="p-2.5 rounded bg-dark text-white font-monospace mb-0" style={{ fontSize: '11px', overflowX: 'auto' }}>
{`// JavaScript Fetch Example
const query = new URLSearchParams({
  'Your name': nameInput.value,
  'Phone number': phoneInput.value,
  'Email address': emailInput.value,
  'What can we help with?': topicSelect.value,
  'Your message': messageInput.value
});

fetch('/inquiry?' + query.toString());`}
                    </pre>
                  </>
                ) : (
                  <>
                    <p className="text-secondary small mb-2">
                      Send your enrollment form to <code>/enroll</code> (or <code>/enool</code>):
                    </p>
                    <pre className="p-2.5 rounded bg-dark text-white font-monospace mb-0" style={{ fontSize: '11px', overflowX: 'auto' }}>
{`// JavaScript Fetch Example
const query = new URLSearchParams({
  parent_name: parentInput.value,
  phone: phoneInput.value,
  email: emailInput.value,
  child_name: childInput.value,
  child_age: ageInput.value,
  preferred_program: programSelect.value,
  preferred_start_date: dateInput.value,
  message: notesInput.value
});

fetch('/enroll?' + query.toString());`}
                    </pre>
                  </>
                )}
              </div>

              <div className="modal-footer border-top py-2 px-3">
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowScriptModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      {confirmDialog.isOpen && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 1060 }}
          onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg p-3" style={{ borderRadius: '12px' }}>
              <h6 className="fw-bold text-dark mb-1">{confirmDialog.title}</h6>
              <p className="text-secondary small mb-3">{confirmDialog.message}</p>
              <div className="d-flex justify-content-end gap-1.5">
                <button 
                  type="button" 
                  className="btn btn-sm btn-light border px-2.5 py-1"
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className={`btn btn-sm btn-${confirmDialog.confirmVariant || 'danger'} px-2.5 py-1`}
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
