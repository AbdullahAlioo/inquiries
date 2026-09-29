import React, { useState, useEffect, useMemo } from 'react';
import { Ticket, WaitingEntry } from './types.ts';

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingEntry[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [totalWaiting, setTotalWaiting] = useState(0);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [dealtFilter, setDealtFilter] = useState<'all' | 'pending' | 'dealt'>('all');
  
  // Sorting: 0 = Dealt, 1 = Parent, 2 = Child, 3 = Phone, 4 = Email, 5 = Program, 6 = Start Date, 7 = Date Received
  const [sortCol, setSortCol] = useState<number>(7);
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Responsive View Mode: Table vs Card View
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 992) {
      return 'cards';
    }
    return 'table';
  });
  
  // UI states
  const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'danger' | 'info'; text: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  // Modals
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);

  // New waiting entry form
  const [newWaitEmail, setNewWaitEmail] = useState('');
  const [newWaitWebsite, setNewWaitWebsite] = useState('');

  // 8 Core Daycare Inquiry Fields for Test Form
  const [testParentName, setTestParentName] = useState('Sarah & David Miller');
  const [testPhone, setTestPhone] = useState('+1 (555) 349-1120');
  const [testChildName, setTestChildName] = useState('Oliver Miller');
  const [testChildAge, setTestChildAge] = useState('2.5 years');
  const [testEmail, setTestEmail] = useState('sarah.miller@example.com');
  const [testProgram, setTestProgram] = useState('Toddler Program (Full-Day)');
  const [testStartDate, setTestStartDate] = useState('2026-11-01');
  const [testMessage, setTestMessage] = useState('Looking for enrolment starting November. We would love to book a morning tour to visit the facility.');
  const [testSending, setTestSending] = useState(false);

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      setLastUpdated(new Date().toISOString().slice(0, 19).replace('T', ' '));
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data
  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/inquiries');
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        setTotalTickets(data.total_tickets || 0);
        setWaitingList(data.waiting_list || []);
        setTotalWaiting(data.total_waiting || 0);
        setLastUpdated(new Date().toISOString().slice(0, 19).replace('T', ' '));
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // SSE connection for live incoming inquiries from main website
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/inquiries/stream');
      
      eventSource.addEventListener('inquiry_created', (event) => {
        try {
          const newInquiry: Ticket = JSON.parse(event.data);
          setTickets(prev => [newInquiry, ...prev.filter(t => t.id !== newInquiry.id)]);
          setTotalTickets(prev => prev + 1);
          setFlashMessage({
            type: 'info',
            text: `New enquiry: ${newInquiry.parent_name || newInquiry.name} • Child: ${newInquiry.child_name || 'N/A'} (${newInquiry.preferred_program || 'General'})`
          });
        } catch (e) {
          console.error(e);
        }
      });

      eventSource.addEventListener('inquiry_updated', (event) => {
        try {
          const updated: Ticket = JSON.parse(event.data);
          setTickets(prev => prev.map(t => (t.id === updated.id || t.ticket_number === updated.ticket_number ? updated : t)));
          setSelectedTicket(prev => (prev?.id === updated.id ? updated : prev));
        } catch (e) {
          console.error(e);
        }
      });

      eventSource.addEventListener('inquiry_deleted', (event) => {
        try {
          const { id, ticket_number } = JSON.parse(event.data);
          setTickets(prev => prev.filter(t => t.id !== id && t.ticket_number !== ticket_number));
          setTotalTickets(prev => Math.max(0, prev - 1));
        } catch (e) {
          console.error(e);
        }
      });

      eventSource.addEventListener('inquiries_cleared', () => {
        setTickets([]);
        setTotalTickets(0);
        setWaitingList([]);
        setTotalWaiting(0);
      });

      eventSource.addEventListener('waiting_updated', (event) => {
        try {
          const updatedWait: WaitingEntry[] = JSON.parse(event.data);
          setWaitingList(updatedWait);
          setTotalWaiting(updatedWait.length);
        } catch (e) {
          console.error(e);
        }
      });
    } catch (err) {
      console.error(err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // Toggle Dealt (Tick) status
  const handleToggleDealt = async (id: string, newDealtStatus: boolean) => {
    // Optimistic UI update
    setTickets(prev => prev.map(t => {
      if (t.id === id || t.ticket_number === id) {
        return {
          ...t,
          dealt: newDealtStatus,
          status: newDealtStatus ? 'Converted' : 'Pending'
        };
      }
      return t;
    }));

    if (selectedTicket && (selectedTicket.id === id || selectedTicket.ticket_number === id)) {
      setSelectedTicket(prev => prev ? {
        ...prev,
        dealt: newDealtStatus,
        status: newDealtStatus ? 'Converted' : 'Pending'
      } : null);
    }

    try {
      const res = await fetch(`/api/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealt: newDealtStatus })
      });
      if (res.ok) {
        setFlashMessage({
          type: newDealtStatus ? 'success' : 'info',
          text: newDealtStatus 
            ? `Enquiry marked as Dealt ✓` 
            : `Enquiry marked back as Pending`
        });
      }
    } catch (err) {
      console.error('Failed to toggle dealt status:', err);
      fetchData();
    }
  };

  // Delete enquiry
  const handleDeleteTicket = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete enquiry for "${name}"?`)) return;

    try {
      const res = await fetch(`/api/inquiries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTickets(prev => prev.filter(t => t.id !== id));
        setTotalTickets(prev => Math.max(0, prev - 1));
        if (selectedTicket?.id === id) setSelectedTicket(null);
        setFlashMessage({
          type: 'success',
          text: `Enquiry for ${name} deleted successfully.`
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete waiting entry
  const handleDeleteWaiting = async (id: string, email: string) => {
    if (!window.confirm(`Remove ${email} from waiting list?`)) return;

    try {
      const res = await fetch(`/api/waiting/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setWaitingList(prev => prev.filter(w => w.id !== id));
        setTotalWaiting(prev => Math.max(0, prev - 1));
        setFlashMessage({
          type: 'success',
          text: `Removed ${email} from waiting list.`
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add waiting entry
  const handleAddWaiting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWaitEmail.trim()) return;

    try {
      const res = await fetch('/api/waiting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newWaitEmail, website: newWaitWebsite })
      });
      if (res.ok) {
        const data = await res.json();
        setWaitingList(prev => [data.entry, ...prev]);
        setTotalWaiting(prev => prev + 1);
        setNewWaitEmail('');
        setNewWaitWebsite('');
        setShowWaitingModal(false);
        setFlashMessage({
          type: 'success',
          text: 'Parent added to waiting list.'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit test enquiry with all 8 fields
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestSending(true);

    try {
      const query = new URLSearchParams({
        parent_name: testParentName,
        phone: testPhone,
        child_name: testChildName,
        child_age: testChildAge,
        email: testEmail,
        preferred_program: testProgram,
        preferred_start_date: testStartDate,
        message: testMessage,
        source: 'daycare-visit-form'
      });

      const res = await fetch(`/inquiry?${query.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const data = await res.json();
        setShowTestModal(false);
        setFlashMessage({
          type: 'success',
          text: `Test enquiry received for ${testParentName} (${data.ticket_number || data.id})!`
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send test inquiry.');
    } finally {
      setTestSending(false);
    }
  };

  // Clear all data to 0
  const handleClearAll = async () => {
    const confirmation = window.prompt('Type "RESET" to confirm clearing all parent enquiries and waiting list to 0:');
    if (confirmation !== 'RESET') {
      if (confirmation !== null) alert('Action cancelled: input did not match "RESET".');
      return;
    }

    try {
      const res = await fetch('/api/inquiries/clear_all', { method: 'POST' });
      if (res.ok) {
        setTickets([]);
        setTotalTickets(0);
        setWaitingList([]);
        setTotalWaiting(0);
        setSelectedTicket(null);
        setFlashMessage({
          type: 'success',
          text: 'All records have been reset to 0.'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Dealt status filter
      if (dealtFilter === 'pending' && ticket.dealt) return false;
      if (dealtFilter === 'dealt' && !ticket.dealt) return false;

      // Text search across all 8 fields
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = (ticket.parent_name || ticket.name || '').toLowerCase();
        const cName = (ticket.child_name || '').toLowerCase();
        const cAge = (ticket.child_age || '').toLowerCase();
        const em = (ticket.email || '').toLowerCase();
        const ph = (ticket.phone || '').toLowerCase();
        const prog = (ticket.preferred_program || ticket.country || ticket.interest || '').toLowerCase();
        const sDate = (ticket.preferred_start_date || '').toLowerCase();
        const msg = (ticket.message || ticket.region || '').toLowerCase();
        const tNum = (ticket.ticket_number || '').toLowerCase();

        const match =
          pName.includes(q) ||
          cName.includes(q) ||
          cAge.includes(q) ||
          em.includes(q) ||
          ph.includes(q) ||
          prog.includes(q) ||
          sDate.includes(q) ||
          msg.includes(q) ||
          tNum.includes(q);

        if (!match) return false;
      }

      // Preferred program filter
      if (programFilter) {
        const ticketProg = ticket.preferred_program || ticket.country || ticket.interest || '';
        if (ticketProg !== programFilter) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, searchQuery, programFilter, dealtFilter]);

  // Sorted tickets
  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      let valA: string = '';
      let valB: string = '';

      switch (sortCol) {
        case 0: valA = a.dealt ? '1' : '0'; valB = b.dealt ? '1' : '0'; break;
        case 1: valA = a.parent_name || a.name || ''; valB = b.parent_name || b.name || ''; break;
        case 2: valA = a.child_name || ''; valB = b.child_name || ''; break;
        case 3: valA = a.phone || ''; valB = b.phone || ''; break;
        case 4: valA = a.email || ''; valB = b.email || ''; break;
        case 5: valA = a.preferred_program || a.country || ''; valB = b.preferred_program || b.country || ''; break;
        case 6: valA = a.preferred_start_date || ''; valB = b.preferred_start_date || ''; break;
        case 7: valA = a.timestamp || a.createdAt || ''; valB = b.timestamp || b.createdAt || ''; break;
        default: return 0;
      }

      const cmp = valA.localeCompare(valB);
      return sortAsc ? cmp : -cmp;
    });
  }, [filteredTickets, sortCol, sortAsc]);

  const handleSort = (colIndex: number) => {
    if (sortCol === colIndex) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(colIndex);
      setSortAsc(true);
    }
  };

  // Export visible to CSV
  const handleExportVisible = () => {
    const headers = [
      'Status (Dealt)',
      'Request ID',
      'Parent or Guardian Name',
      'Phone Number',
      'Child Name',
      'Child Age',
      'Email Address',
      'Preferred Program',
      'Preferred Start Date',
      'Message',
      'Date Received'
    ];
    const rows = sortedTickets.map(t => [
      t.dealt ? 'DEALT / DONE' : 'PENDING',
      t.ticket_number || t.id,
      `"${(t.parent_name || t.name || '').replace(/"/g, '""')}"`,
      `"${(t.phone || '').replace(/"/g, '""')}"`,
      `"${(t.child_name || '').replace(/"/g, '""')}"`,
      `"${(t.child_age || '').replace(/"/g, '""')}"`,
      `"${(t.email || '').replace(/"/g, '""')}"`,
      `"${(t.preferred_program || t.country || t.interest || '').replace(/"/g, '""')}"`,
      `"${(t.preferred_start_date || '').replace(/"/g, '""')}"`,
      `"${(t.message || t.region || t.notes || '').replace(/"/g, '""')}"`,
      t.timestamp || ''
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'daycare_parent_enquiries.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats
  const uniqueParentsCount = useMemo(() => {
    return new Set(tickets.map(t => t.email)).size;
  }, [tickets]);

  const uniquePrograms = useMemo(() => {
    const set = new Set(tickets.map(t => t.preferred_program || t.country || t.interest).filter(Boolean));
    return Array.from(set).sort();
  }, [tickets]);

  const dealtCount = useMemo(() => {
    return tickets.filter(t => t.dealt).length;
  }, [tickets]);

  const pendingCount = useMemo(() => {
    return tickets.filter(t => !t.dealt).length;
  }, [tickets]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg">
        <div className="container">
          <a className="navbar-brand d-flex align-items-center gap-2" href="/">
            <i className="fas fa-star text-warning"></i>
            <span>Little Stars Daycare</span>
          </a>
          <div className="navbar-nav ms-auto d-flex flex-row gap-2 align-items-center">
            <button
              onClick={() => setShowScriptModal(true)}
              className="btn btn-outline-secondary btn-sm"
              style={{ fontSize: '13px' }}
              title="View JavaScript snippet for your website"
            >
              <i className="fas fa-code me-1"></i>
              Website Code
            </button>
            <button
              onClick={() => setShowTestModal(true)}
              className="btn btn-outline-primary btn-sm"
              style={{ fontSize: '13px' }}
            >
              <i className="fas fa-plus-circle me-1"></i>
              Test Enquiry
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container-fluid mt-4" style={{ maxWidth: '1440px', flex: '1 0 auto' }}>
        
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

        {/* Header Title & Actions */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  <i className="fas fa-child me-2" style={{ color: 'var(--accent-color)' }}></i>
                  Daycare Enquiries & Registrations
                </h1>
                <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '14px' }}>
                  Parent, child, program, and enrollment enquiry records
                </p>
              </div>
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <button 
                  className="btn btn-outline-secondary btn-sm" 
                  onClick={fetchData}
                  disabled={isRefreshing}
                >
                  <i className={`fas fa-sync-alt ${isRefreshing ? 'fa-spin' : ''} me-1`}></i>
                  Refresh
                </button>
                {tickets.length > 0 && (
                  <a href="/export_excel" className="btn btn-primary btn-sm">
                    <i className="fas fa-file-excel me-1"></i>
                    Export Excel / CSV
                  </a>
                )}
                {tickets.length > 0 && (
                  <button 
                    className="btn btn-outline-danger btn-sm" 
                    onClick={handleClearAll}
                    title="Reset all records to 0"
                  >
                    <i className="fas fa-trash-alt me-1"></i>
                    Reset to 0
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards (Starts at 0, shows Pending vs Dealt) */}
        <div className="row mb-4 g-3">
          <div className="col-md-3 col-sm-6">
            <div className="stats-card">
              <div className="stats-icon">
                <i className="fas fa-envelope-open"></i>
              </div>
              <div className="stats-content">
                <h3>{totalTickets}</h3>
                <p>Total Enquiries</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="stats-card">
              <div className="stats-icon" style={{ color: pendingCount > 0 ? '#f59e0b' : '#3b82f6' }}>
                <i className="fas fa-clock"></i>
              </div>
              <div className="stats-content">
                <h3 style={{ color: pendingCount > 0 ? '#b45309' : 'inherit' }}>{pendingCount}</h3>
                <p>Pending (Need Action)</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="stats-card">
              <div className="stats-icon" style={{ color: '#10b981' }}>
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="stats-content">
                <h3 style={{ color: '#047857' }}>{dealtCount}</h3>
                <p>Dealt With (Ticked)</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="stats-card">
              <div className="stats-icon">
                <i className="fas fa-users"></i>
              </div>
              <div className="stats-content">
                <h3>{uniqueParentsCount}</h3>
                <p>Unique Families</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Enquiries Table Card */}
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <h5 className="card-title mb-0" style={{ fontSize: '16px', fontWeight: 600 }}>
                    <i className="fas fa-list me-2" style={{ color: 'var(--accent-color)' }}></i>
                    Parent Enquiries List
                  </h5>
                  <span className="badge bg-secondary" style={{ fontSize: '12px' }}>
                    {filteredTickets.length} shown
                  </span>
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {/* View Mode Toggle (Table vs Cards) */}
                  <div className="btn-group btn-group-sm" role="group" aria-label="View Mode">
                    <button
                      type="button"
                      className={`btn ${viewMode === 'table' ? 'btn-dark' : 'btn-outline-secondary'}`}
                      onClick={() => setViewMode('table')}
                      title="Spreadsheet Table View"
                    >
                      <i className="fas fa-table me-1"></i>
                      <span className="d-none d-sm-inline">Table</span>
                    </button>
                    <button
                      type="button"
                      className={`btn ${viewMode === 'cards' ? 'btn-dark' : 'btn-outline-secondary'}`}
                      onClick={() => setViewMode('cards')}
                      title="Mobile & Tablet Friendly Cards"
                    >
                      <i className="fas fa-th-large me-1"></i>
                      <span className="d-none d-sm-inline">Cards</span>
                    </button>
                  </div>

                  {/* Filter Pills: All / Pending Only / Dealt Only */}
                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      type="button"
                      className={`btn ${dealtFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setDealtFilter('all')}
                    >
                      All ({tickets.length})
                    </button>
                    <button
                      type="button"
                      className={`btn ${dealtFilter === 'pending' ? 'btn-warning text-dark' : 'btn-outline-secondary'}`}
                      onClick={() => setDealtFilter('pending')}
                    >
                      Pending ({pendingCount})
                    </button>
                    <button
                      type="button"
                      className={`btn ${dealtFilter === 'dealt' ? 'btn-success' : 'btn-outline-secondary'}`}
                      onClick={() => setDealtFilter('dealt')}
                    >
                      Dealt ({dealtCount})
                    </button>
                  </div>
                </div>
              </div>

              <div className="card-body">
                {tickets.length > 0 ? (
                  <>
                    <div className="table-controls mb-3">
                      <div className="row g-2">
                        <div className="col-md-7">
                          <div className="input-group">
                            <span className="input-group-text bg-white">
                              <i className="fas fa-search text-muted"></i>
                            </span>
                            <input
                              type="text"
                              id="searchInput"
                              className="form-control"
                              placeholder="Search parent, child name, age, phone, email, or message..."
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
                            id="programFilter"
                            className="form-select"
                            value={programFilter}
                            onChange={(e) => setProgramFilter(e.target.value)}
                          >
                            <option value="">All Programs ({uniquePrograms.length})</option>
                            {uniquePrograms.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Mobile View Tip / Hint Banner */}
                    <div className="d-flex justify-content-between align-items-center mb-2 px-1 text-muted small">
                      <span className="d-inline-flex align-items-center gap-1">
                        <i className="fas fa-info-circle text-primary"></i>
                        <span>
                          {viewMode === 'table' 
                            ? 'Table is scrollable horizontally on smaller screens, or switch to "Cards" view above.' 
                            : 'Showing responsive Cards view for easy reading on all devices.'}
                        </span>
                      </span>
                      <span className="badge bg-light text-secondary border">
                        {viewMode === 'table' ? '↔ Horizontal Scroll' : '📱 Responsive Cards'}
                      </span>
                    </div>

                    {viewMode === 'table' ? (
                      /* SPREADSHEET TABLE VIEW */
                      <div className="table-responsive shadow-xs">
                        <table className="table table-hover align-middle mb-0" id="ticketsTable" style={{ minWidth: '1150px' }}>
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
                              <th style={{ minWidth: '220px', maxWidth: '320px' }}>Message</th>
                              <th style={{ width: '95px', minWidth: '95px', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody id="ticketsTableBody">
                            {sortedTickets.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="text-center py-4 text-muted">
                                  No enquiries match your search or filter.
                                </td>
                              </tr>
                            ) : (
                              sortedTickets.map((ticket) => {
                                const parentName = ticket.parent_name || ticket.name || 'Parent / Guardian';
                                const childName = ticket.child_name || '';
                                const childAge = ticket.child_age || '';
                                const program = ticket.preferred_program || ticket.country || ticket.interest || 'General';
                                const startDate = ticket.preferred_start_date || '';
                                const message = ticket.message || ticket.region || '';

                                return (
                                  <tr 
                                    key={ticket.id} 
                                    style={{ 
                                      cursor: 'pointer',
                                      backgroundColor: ticket.dealt ? '#f8fafc' : '#ffffff',
                                      transition: 'background-color 0.2s ease'
                                    }}
                                    onClick={() => setSelectedTicket(ticket)}
                                  >
                                    {/* 1. TICK / DONE TOGGLE */}
                                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleDealt(ticket.id, !ticket.dealt)}
                                        className="btn btn-sm"
                                        style={{
                                          backgroundColor: ticket.dealt ? '#ecfdf5' : '#f8fafc',
                                          borderColor: ticket.dealt ? '#10b981' : '#cbd5e1',
                                          color: ticket.dealt ? '#047857' : '#64748b',
                                          fontSize: '12px',
                                          fontWeight: 600,
                                          padding: '0.25rem 0.65rem',
                                          borderRadius: '6px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.35rem',
                                          boxShadow: 'none',
                                          whiteSpace: 'nowrap'
                                        }}
                                        title={ticket.dealt ? "Ticked as Dealt. Click to un-tick" : "Click to tick when you have dealt with this enquiry"}
                                      >
                                        <i 
                                          className={ticket.dealt ? "fas fa-check-circle text-success" : "far fa-circle text-muted"}
                                          style={{ fontSize: '14px' }}
                                        ></i>
                                        <span>{ticket.dealt ? 'Dealt' : 'Pending'}</span>
                                      </button>
                                    </td>

                                    {/* 2. PARENT OR GUARDIAN NAME */}
                                    <td>
                                      <div className="d-flex align-items-center gap-1.5 flex-wrap">
                                        <strong style={{ color: ticket.dealt ? '#475569' : '#0f172a' }}>
                                          {parentName}
                                        </strong>
                                        {ticket.dealt && (
                                          <span className="badge bg-success ms-1" style={{ fontSize: '10px', padding: '0.15rem 0.35rem' }}>
                                            Done
                                          </span>
                                        )}
                                      </div>
                                      <small className="text-muted" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                                        {ticket.ticket_number || ticket.id}
                                      </small>
                                    </td>

                                    {/* 3. CHILD'S NAME & AGE */}
                                    <td style={{ whiteSpace: 'nowrap' }}>
                                      {childName ? (
                                        <div className="d-flex align-items-center gap-1 flex-wrap">
                                          <span className="fw-semibold text-dark">
                                            <i className="fas fa-shapes text-primary me-1" style={{ fontSize: '11px' }}></i>
                                            {childName}
                                          </span>
                                          {childAge && (
                                            <span className="badge bg-light text-dark border" style={{ fontSize: '11px' }}>
                                              {childAge}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-muted small"><em>Not provided</em></span>
                                      )}
                                    </td>

                                    {/* 4. PHONE NUMBER */}
                                    <td style={{ whiteSpace: 'nowrap' }}>
                                      {ticket.phone ? (
                                        <a 
                                          href={`tel:${ticket.phone}`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-decoration-none text-dark fw-medium"
                                          style={{ fontSize: '13px' }}
                                        >
                                          <i className="fas fa-phone-alt text-muted me-1" style={{ fontSize: '11px' }}></i>
                                          {ticket.phone}
                                        </a>
                                      ) : (
                                        <span className="text-muted">-</span>
                                      )}
                                    </td>

                                    {/* 5. EMAIL ADDRESS */}
                                    <td style={{ wordBreak: 'break-all' }}>
                                      <a 
                                        href={`mailto:${ticket.email}`}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ 
                                          color: ticket.dealt ? '#64748b' : 'inherit', 
                                          textDecoration: 'none',
                                          fontSize: '13px'
                                        }}
                                      >
                                        {ticket.email}
                                      </a>
                                    </td>

                                    {/* 6. PREFERRED PROGRAM */}
                                    <td style={{ whiteSpace: 'nowrap' }}>
                                      <span style={{
                                        background: ticket.dealt ? '#f3f4f6' : '#e0e7ff',
                                        color: ticket.dealt ? '#4b5563' : '#3730a3',
                                        padding: '0.25rem 0.65rem',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        display: 'inline-block',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {program}
                                      </span>
                                    </td>

                                    {/* 7. PREFERRED START DATE */}
                                    <td style={{ whiteSpace: 'nowrap' }}>
                                      {startDate ? (
                                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#334155', whiteSpace: 'nowrap' }}>
                                          <i className="far fa-calendar-alt text-muted me-1"></i>
                                          {startDate}
                                        </span>
                                      ) : (
                                        <span className="text-muted small">Flexible</span>
                                      )}
                                    </td>

                                    {/* 8. MESSAGE */}
                                    <td style={{ maxWidth: '280px' }}>
                                      <div 
                                        className="text-truncate small text-secondary" 
                                        title={message || 'No additional message'}
                                        style={{ maxWidth: '280px' }}
                                      >
                                        {message || <em className="text-muted">No message</em>}
                                      </div>
                                    </td>

                                    {/* ACTIONS */}
                                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                      <div className="btn-group btn-group-sm">
                                        <button
                                          type="button"
                                          className="btn btn-outline-primary"
                                          onClick={() => setSelectedTicket(ticket)}
                                          title="View full details"
                                        >
                                          <i className="fas fa-eye"></i>
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-outline-danger"
                                          onClick={() => handleDeleteTicket(ticket.id, parentName)}
                                          title="Delete this enquiry"
                                        >
                                          <i className="fas fa-trash"></i>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* RESPONSIVE CARDS VIEW (IDEAL FOR MOBILE & TABLET) */
                      <div className="row g-3">
                        {sortedTickets.length === 0 ? (
                          <div className="col-12 text-center py-4 text-muted">
                            No enquiries match your search or filter.
                          </div>
                        ) : (
                          sortedTickets.map((ticket) => {
                            const parentName = ticket.parent_name || ticket.name || 'Parent / Guardian';
                            const childName = ticket.child_name || '';
                            const childAge = ticket.child_age || '';
                            const program = ticket.preferred_program || ticket.country || ticket.interest || 'General';
                            const startDate = ticket.preferred_start_date || '';
                            const message = ticket.message || ticket.region || '';

                            return (
                              <div key={ticket.id} className="col-12 col-md-6 col-xl-4">
                                <div 
                                  className="card h-100 border shadow-xs"
                                  style={{
                                    backgroundColor: ticket.dealt ? '#f8fafc' : '#ffffff',
                                    borderRadius: '12px',
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                                  }}
                                >
                                  {/* Card Header */}
                                  <div className="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center py-2 px-3">
                                    {/* Tick / Done Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleDealt(ticket.id, !ticket.dealt)}
                                      className="btn btn-sm"
                                      style={{
                                        backgroundColor: ticket.dealt ? '#ecfdf5' : '#f1f5f9',
                                        borderColor: ticket.dealt ? '#10b981' : '#cbd5e1',
                                        color: ticket.dealt ? '#047857' : '#475569',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '6px'
                                      }}
                                    >
                                      <i 
                                        className={ticket.dealt ? "fas fa-check-circle text-success me-1" : "far fa-circle text-muted me-1"}
                                      ></i>
                                      {ticket.dealt ? 'Dealt' : 'Pending'}
                                    </button>

                                    {/* Request ID & Delete */}
                                    <div className="d-flex align-items-center gap-2">
                                      <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: '11px' }}>
                                        {ticket.ticket_number || ticket.id}
                                      </span>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger border-0 p-1"
                                        onClick={() => handleDeleteTicket(ticket.id, parentName)}
                                        title="Delete enquiry"
                                      >
                                        <i className="fas fa-trash-alt"></i>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Card Body */}
                                  <div className="card-body p-3">
                                    {/* Parent Name */}
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                      <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: '15px' }}>
                                        <i className="fas fa-user-circle text-primary me-1.5"></i>
                                        {parentName}
                                      </h6>
                                      {ticket.dealt && (
                                        <span className="badge bg-success" style={{ fontSize: '10px' }}>Done</span>
                                      )}
                                    </div>

                                    {/* Child Name & Age */}
                                    <div className="d-flex align-items-center gap-2 mb-2.5 flex-wrap">
                                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1" style={{ fontSize: '12px' }}>
                                        <i className="fas fa-shapes me-1"></i>
                                        Child: {childName || 'Not stated'}
                                      </span>
                                      {childAge && (
                                        <span className="badge bg-light text-dark border px-2 py-1" style={{ fontSize: '12px' }}>
                                          Age: {childAge}
                                        </span>
                                      )}
                                    </div>

                                    {/* Program & Start Date */}
                                    <div className="p-2 rounded bg-light mb-2.5 small">
                                      <div className="d-flex justify-content-between mb-1">
                                        <span className="text-muted">Program:</span>
                                        <strong className="text-primary">{program}</strong>
                                      </div>
                                      <div className="d-flex justify-content-between">
                                        <span className="text-muted">Start Date:</span>
                                        <strong>{startDate || 'Flexible'}</strong>
                                      </div>
                                    </div>

                                    {/* Contact info: Phone & Email */}
                                    <div className="small mb-2.5">
                                      {ticket.phone && (
                                        <div className="mb-1">
                                          <a href={`tel:${ticket.phone}`} className="text-decoration-none text-dark fw-medium d-inline-flex align-items-center gap-1">
                                            <i className="fas fa-phone-alt text-success" style={{ width: '16px' }}></i>
                                            {ticket.phone}
                                          </a>
                                        </div>
                                      )}
                                      <div>
                                        <a href={`mailto:${ticket.email}`} className="text-decoration-none text-secondary d-inline-flex align-items-center gap-1 text-truncate" style={{ maxWidth: '100%' }}>
                                          <i className="fas fa-envelope text-primary" style={{ width: '16px' }}></i>
                                          {ticket.email}
                                        </a>
                                      </div>
                                    </div>

                                    {/* Message */}
                                    {message && (
                                      <div 
                                        className="p-2 rounded border bg-white small text-muted text-truncate"
                                        title={message}
                                        style={{ fontSize: '12px', maxHeight: '52px', overflow: 'hidden' }}
                                      >
                                        <i className="fas fa-quote-left text-muted me-1" style={{ opacity: 0.5 }}></i>
                                        {message}
                                      </div>
                                    )}
                                  </div>

                                  {/* Card Footer */}
                                  <div className="card-footer bg-transparent border-top py-2 px-3 d-flex justify-content-between align-items-center">
                                    <small className="text-muted" style={{ fontSize: '11px' }}>
                                      <i className="far fa-clock me-1"></i>
                                      {ticket.timestamp || ''}
                                    </small>
                                    <button
                                      type="button"
                                      className="btn btn-outline-primary btn-sm py-1 px-2"
                                      style={{ fontSize: '12px' }}
                                      onClick={() => setSelectedTicket(ticket)}
                                    >
                                      <i className="fas fa-eye me-1"></i>
                                      Details
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                      <div>
                        <small className="text-muted">
                          Showing <strong>{sortedTickets.length}</strong> of {totalTickets} enquiries ({dealtCount} dealt with)
                        </small>
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={handleExportVisible}
                        >
                          <i className="fas fa-download me-1"></i>
                          Download Filtered List (.csv)
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-5">
                    <i className="fas fa-inbox fa-3x text-muted mb-3" style={{ opacity: 0.5 }}></i>
                    <h5>No enquiries yet</h5>
                    <p className="text-muted mb-3">
                      Enquiries submitted by parents through your website form will appear here automatically in real time.
                    </p>
                    <div className="d-flex justify-content-center gap-2">
                      <button
                        onClick={() => setShowTestModal(true)}
                        className="btn btn-primary btn-sm"
                      >
                        <i className="fas fa-plus-circle me-1"></i>
                        Submit a Sample Enquiry
                      </button>
                      <button
                        onClick={() => setShowScriptModal(true)}
                        className="btn btn-outline-secondary btn-sm"
                      >
                        <i className="fas fa-code me-1"></i>
                        Get Website Form Code
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Waiting List Section */}
        <div className="row mt-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0" style={{ fontSize: '16px', fontWeight: 600 }}>
                  <i className="fas fa-user-clock me-2" style={{ color: 'var(--accent-color)' }}></i>
                  Waiting List & Tour Requests ({totalWaiting})
                </h5>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => setShowWaitingModal(true)}
                >
                  <i className="fas fa-plus me-1"></i>
                  Add to Waiting List
                </button>
              </div>
              <div className="card-body">
                {waitingList.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead>
                        <tr>
                          <th>Parent Email</th>
                          <th>Contact / Child Note</th>
                          <th>Sign-up Date</th>
                          <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {waitingList.map((entry) => (
                          <tr key={entry.id}>
                            <td><strong>{entry.email}</strong></td>
                            <td>{entry.website || 'Not provided'}</td>
                            <td>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                {entry.timestamp}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleDeleteWaiting(entry.id, entry.email)}
                                title="Remove from waiting list"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="fas fa-clock fa-2x text-muted mb-2" style={{ opacity: 0.5 }}></i>
                    <h6 className="text-muted">No one on the waiting list</h6>
                    <p className="text-muted small mb-0">Parents waiting for enrollment openings can be logged here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="bg-dark text-light mt-5 py-3">
        <div className="container text-center">
          <p className="mb-0 small text-muted">
            <i className="fas fa-shield-alt me-1"></i>
            Little Stars Daycare Admin System • Last synced: {lastUpdated}
          </p>
        </div>
      </footer>

      {/* Detail Modal with All 8 Daycare Fields & Tick Option */}
      {selectedTicket && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedTicket(null)}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <div>
                  <h5 className="modal-title font-weight-bold mb-0">
                    <i className="fas fa-child text-primary me-2"></i>
                    Enquiry Details: {selectedTicket.ticket_number}
                  </h5>
                  <small className="text-muted">Received on {selectedTicket.timestamp}</small>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelectedTicket(null)}></button>
              </div>
              <div className="modal-body p-4">
                
                {/* Dealt / Tick Status Banner inside modal */}
                <div 
                  className={`p-3 rounded-3 mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2 ${
                    selectedTicket.dealt ? 'bg-success-subtle border border-success' : 'bg-warning-subtle border border-warning'
                  }`}
                >
                  <div className="d-flex align-items-center gap-2">
                    <i className={`fas ${selectedTicket.dealt ? 'fa-check-circle text-success' : 'fa-clock text-warning'} fs-4`}></i>
                    <div>
                      <strong className={selectedTicket.dealt ? 'text-success' : 'text-dark'}>
                        {selectedTicket.dealt ? 'This enquiry has been dealt with' : 'Pending: Awaiting Response'}
                      </strong>
                      <div className="small text-muted">
                        {selectedTicket.dealt ? 'Tick mark is active so your team knows this parent has been contacted.' : 'Click the button once you have phoned or emailed the parent.'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm ${selectedTicket.dealt ? 'btn-outline-secondary' : 'btn-success'}`}
                    onClick={() => handleToggleDealt(selectedTicket.id, !selectedTicket.dealt)}
                  >
                    <i className={`fas ${selectedTicket.dealt ? 'fa-undo' : 'fa-check'} me-1`}></i>
                    {selectedTicket.dealt ? 'Mark as Pending' : 'Tick as Dealt With'}
                  </button>
                </div>

                {/* 1 & 2: Parent or Guardian & Contact */}
                <div className="card mb-3 border">
                  <div className="card-header bg-light py-2">
                    <strong className="small text-uppercase text-secondary">
                      <i className="fas fa-user-friends me-1 text-primary"></i>
                      Parent or Guardian Details
                    </strong>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="text-muted small d-block">Parent or Guardian Name</label>
                        <span className="fw-bold fs-6">{selectedTicket.parent_name || selectedTicket.name || 'Not provided'}</span>
                      </div>
                      <div className="col-md-4">
                        <label className="text-muted small d-block">Phone Number</label>
                        {selectedTicket.phone ? (
                          <a href={`tel:${selectedTicket.phone}`} className="fw-bold fs-6 text-decoration-none">
                            <i className="fas fa-phone-alt me-1 text-muted small"></i>
                            {selectedTicket.phone}
                          </a>
                        ) : (
                          <span className="text-muted">Not provided</span>
                        )}
                      </div>
                      <div className="col-md-4">
                        <label className="text-muted small d-block">Email Address</label>
                        <a href={`mailto:${selectedTicket.email}`} className="fw-bold fs-6 text-decoration-none">
                          <i className="fas fa-envelope me-1 text-muted small"></i>
                          {selectedTicket.email}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 & 4: Child's Information */}
                <div className="card mb-3 border">
                  <div className="card-header bg-light py-2">
                    <strong className="small text-uppercase text-secondary">
                      <i className="fas fa-baby me-1 text-info"></i>
                      Child’s Information
                    </strong>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="text-muted small d-block">Child’s Name</label>
                        <span className="fw-bold fs-6 text-dark">
                          {selectedTicket.child_name || 'Not provided'}
                        </span>
                      </div>
                      <div className="col-md-6">
                        <label className="text-muted small d-block">Child’s Age</label>
                        <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle fs-6 px-3 py-1">
                          {selectedTicket.child_age || 'Not provided'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5 & 6: Preferred Program & Preferred Start Date */}
                <div className="card mb-3 border">
                  <div className="card-header bg-light py-2">
                    <strong className="small text-uppercase text-secondary">
                      <i className="fas fa-graduation-cap me-1 text-success"></i>
                      Program & Enrollment Preferences
                    </strong>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="text-muted small d-block">Preferred Program</label>
                        <span className="badge bg-primary fs-6 px-3 py-1">
                          {selectedTicket.preferred_program || selectedTicket.country || selectedTicket.interest || 'General Program'}
                        </span>
                      </div>
                      <div className="col-md-6">
                        <label className="text-muted small d-block">Preferred Start Date</label>
                        <span className="fw-bold fs-6 text-dark">
                          <i className="far fa-calendar-check text-success me-1"></i>
                          {selectedTicket.preferred_start_date || 'Flexible'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 7: Message */}
                <div className="card mb-3 border">
                  <div className="card-header bg-light py-2">
                    <strong className="small text-uppercase text-secondary">
                      <i className="fas fa-comment-alt me-1 text-secondary"></i>
                      Message / Notes from Parent
                    </strong>
                  </div>
                  <div className="card-body bg-light-subtle">
                    <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                      {selectedTicket.message || selectedTicket.region || 'No message provided.'}
                    </p>
                  </div>
                </div>

              </div>
              <div className="modal-footer bg-light">
                {selectedTicket.phone && (
                  <a
                    href={`tel:${selectedTicket.phone}`}
                    className="btn btn-outline-success btn-sm"
                  >
                    <i className="fas fa-phone-alt me-1"></i>
                    Call Parent
                  </a>
                )}
                <a
                  href={`mailto:${selectedTicket.email}?subject=Little%20Stars%20Daycare%20Enquiry%20(${selectedTicket.child_name ? encodeURIComponent(selectedTicket.child_name) : 'Visit'})`}
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (!selectedTicket.dealt) {
                      handleToggleDealt(selectedTicket.id, true);
                    }
                  }}
                >
                  <i className="fas fa-reply me-1"></i>
                  Reply via Email & Mark Dealt
                </a>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedTicket(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Test Enquiry Modal (With All 8 Fields) */}
      {showTestModal && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowTestModal(false)}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-plus-circle me-2"></i>
                  Submit Test Daycare Enquiry
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowTestModal(false)}></button>
              </div>
              <form onSubmit={handleSendTest}>
                <div className="modal-body p-4">
                  <p className="text-muted small mb-3">
                    Sends a sample inquiry containing all <strong>8 fields</strong> directly into the system so you can test how it appears and how the <strong>Tick / Done</strong> feature works.
                  </p>
                  
                  <div className="row g-3 mb-3">
                    {/* 1. Parent or guardian name */}
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">1. Parent or Guardian Name *</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        required
                        placeholder="e.g. Sarah & David Miller"
                        value={testParentName}
                        onChange={(e) => setTestParentName(e.target.value)}
                      />
                    </div>

                    {/* 2. Phone number */}
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">2. Phone Number</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. +1 (555) 349-1120"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    {/* 3. Child's name */}
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">3. Child’s Name</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Oliver Miller"
                        value={testChildName}
                        onChange={(e) => setTestChildName(e.target.value)}
                      />
                    </div>

                    {/* 4. Child's age */}
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">4. Child’s Age</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. 2.5 years or 18 months"
                        value={testChildAge}
                        onChange={(e) => setTestChildAge(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    {/* 5. Email address */}
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">5. Email Address *</label>
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        required
                        placeholder="e.g. sarah.miller@example.com"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                      />
                    </div>

                    {/* 6. Preferred program */}
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">6. Preferred Program</label>
                      <select
                        className="form-select form-select-sm"
                        value={testProgram}
                        onChange={(e) => setTestProgram(e.target.value)}
                      >
                        <option value="Infant Care (0 - 18 months)">Infant Care (0 - 18 months)</option>
                        <option value="Toddler Program (Full-Day)">Toddler Program (Full-Day)</option>
                        <option value="Pre-K & Early Learning">Pre-K & Early Learning</option>
                        <option value="Part-Time / Flexible Care">Part-Time / Flexible Care</option>
                        <option value="After-School Care">After-School Care</option>
                      </select>
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    {/* 7. Preferred start date */}
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">7. Preferred Start Date</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. 2026-11-01 or As soon as possible"
                        value={testStartDate}
                        onChange={(e) => setTestStartDate(e.target.value)}
                      />
                    </div>

                    {/* 8. Message */}
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">8. Message / Special Requests</label>
                      <textarea
                        rows={2}
                        className="form-control form-control-sm"
                        placeholder="Any dietary needs, tour time preferences, or questions..."
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                      />
                    </div>
                  </div>

                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowTestModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={testSending}>
                    {testSending ? (
                      <>
                        <i className="fas fa-spinner fa-spin me-1"></i>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-1"></i>
                        Submit Test Enquiry
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Website Code Integration Helper Modal */}
      {showScriptModal && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowScriptModal(false)}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title">
                  <i className="fas fa-code text-warning me-2"></i>
                  Website Form Integration Code
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowScriptModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-muted small">
                  Copy this code into your daycare website's form submission script to send all 8 fields directly to your admin dashboard:
                </p>

                <div className="bg-dark text-light p-3 rounded mb-3" style={{ fontSize: '13px', fontFamily: 'monospace', overflowX: 'auto' }}>
                  <pre className="mb-0" style={{ color: '#a5f3fc' }}>{`// 1. Set your backend URL
var inquiryServer = window.location.origin + '/inquiry?';

// 2. Build the query with all 8 daycare fields
var params = new URLSearchParams({
  parent_name: document.getElementById('parent_name').value,
  phone: document.getElementById('phone').value,
  child_name: document.getElementById('child_name').value,
  child_age: document.getElementById('child_age').value,
  email: document.getElementById('email').value,
  preferred_program: document.getElementById('preferred_program').value,
  preferred_start_date: document.getElementById('preferred_start_date').value,
  message: document.getElementById('message').value
});

// 3. Send to backend
fetch(inquiryServer + params.toString())
  .then(res => res.json())
  .then(data => {
    alert("Thank you! Your daycare enquiry has been received.");
  });`}</pre>
                </div>

                <div className="alert alert-info py-2 small mb-0">
                  <i className="fas fa-info-circle me-1"></i>
                  <strong>Tip:</strong> You can also send a <code>POST</code> request with a JSON or FormData body containing these same 8 parameter names.
                </div>
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

      {/* Add Waiting Entry Modal */}
      {showWaitingModal && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowWaitingModal(false)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-user-plus me-2 text-primary"></i>
                  Add to Waiting List
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowWaitingModal(false)}></button>
              </div>
              <form onSubmit={handleAddWaiting}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Parent Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="parent@example.com"
                      className="form-control"
                      value={newWaitEmail}
                      onChange={(e) => setNewWaitEmail(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Child Name / Program / Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Emma (18 mo) - Toddler room waiting"
                      className="form-control"
                      value={newWaitWebsite}
                      onChange={(e) => setNewWaitWebsite(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowWaitingModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Add to Waiting List
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
