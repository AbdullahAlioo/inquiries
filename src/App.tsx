import React, { useState, useEffect, useMemo } from 'react';
import { Ticket, WaitingEntry } from './types.ts';

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingEntry[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [totalWaiting, setTotalWaiting] = useState(0);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [dealtFilter, setDealtFilter] = useState<'all' | 'pending' | 'dealt'>('all');
  
  // Sorting
  const [sortCol, setSortCol] = useState<number>(6); // default to Date descending
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  
  // UI states
  const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'danger' | 'info'; text: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  // Modals
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showWaitingModal, setShowWaitingModal] = useState(false);

  // New waiting entry form
  const [newWaitEmail, setNewWaitEmail] = useState('');
  const [newWaitWebsite, setNewWaitWebsite] = useState('');

  // Test form state
  const [testName, setTestName] = useState('Sarah & John Miller');
  const [testEmail, setTestEmail] = useState('sarah.miller@example.com');
  const [testPhone, setTestPhone] = useState('+1 (555) 349-1120');
  const [testType, setTestType] = useState('Infant Care Enrollment');
  const [testNotes, setTestNotes] = useState('Looking for infant full-time room starting next month.');
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
            text: `New parent enquiry received: ${newInquiry.name} (${newInquiry.country || newInquiry.interest})`
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
        const data = await res.json();
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

  // Delete ticket
  const handleDeleteTicket = async (id: string, name: string) => {
    if (!window.confirm(`Delete enquiry from ${name}?`)) return;

    try {
      const res = await fetch(`/api/inquiries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTickets(prev => prev.filter(t => t.id !== id && t.ticket_number !== id));
        setTotalTickets(prev => Math.max(0, prev - 1));
        setFlashMessage({
          type: 'success',
          text: `Enquiry from ${name} deleted successfully.`
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

  // Submit test enquiry (mirrors website script: GET /inquiry?...)
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestSending(true);

    try {
      const query = new URLSearchParams({
        name: testName,
        email: testEmail,
        phone: testPhone,
        country: testType,
        interest: testType,
        region: testNotes,
        message: testNotes,
        source: 'book-a-visit-form'
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
          text: `Test enquiry received (${data.ticket_number || data.id})!`
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send inquiry.');
    } finally {
      setTestSending(false);
    }
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Dealt filter
      if (dealtFilter === 'pending' && ticket.dealt) return false;
      if (dealtFilter === 'dealt' && !ticket.dealt) return false;

      // Text search
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const match =
          (ticket.name && ticket.name.toLowerCase().includes(q)) ||
          (ticket.email && ticket.email.toLowerCase().includes(q)) ||
          (ticket.phone && ticket.phone.toLowerCase().includes(q)) ||
          (ticket.ticket_number && ticket.ticket_number.toLowerCase().includes(q)) ||
          (ticket.country && ticket.country.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Enquiry type filter
      if (countryFilter && ticket.country !== countryFilter) {
        return false;
      }

      return true;
    });
  }, [tickets, searchQuery, countryFilter, dealtFilter]);

  // Sorted tickets
  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      let valA: string = '';
      let valB: string = '';

      switch (sortCol) {
        case 0: valA = a.dealt ? '1' : '0'; valB = b.dealt ? '1' : '0'; break;
        case 1: valA = a.name || ''; valB = b.name || ''; break;
        case 2: valA = a.email || ''; valB = b.email || ''; break;
        case 3: valA = a.phone || ''; valB = b.phone || ''; break;
        case 4: valA = a.country || ''; valB = b.country || ''; break;
        case 5: valA = a.ticket_number || ''; valB = b.ticket_number || ''; break;
        case 6: valA = a.timestamp || a.createdAt || ''; valB = b.timestamp || b.createdAt || ''; break;
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
    const headers = ['Dealt', 'Name', 'Email', 'Phone', 'Enquiry Type', 'Request ID', 'Status', 'Date', 'Notes'];
    const rows = sortedTickets.map(t => [
      t.dealt ? 'YES' : 'NO',
      `"${(t.name || '').replace(/"/g, '""')}"`,
      `"${(t.email || '').replace(/"/g, '""')}"`,
      `"${(t.phone || '').replace(/"/g, '""')}"`,
      `"${(t.country || '').replace(/"/g, '""')}"`,
      t.ticket_number || t.id,
      t.dealt ? 'Dealt' : 'Pending',
      t.timestamp || '',
      `"${(t.region || t.message || t.notes || '').replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'parent_enquiries.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats
  const uniqueParentsCount = useMemo(() => {
    return new Set(tickets.map(t => t.email)).size;
  }, [tickets]);

  const uniqueCountries = useMemo(() => {
    const set = new Set(tickets.map(t => t.country).filter(Boolean));
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
      
      {/* Navigation Bar (Clean & Simple, Script Button Removed) */}
      <nav className="navbar navbar-expand-lg">
        <div className="container">
          <a className="navbar-brand" href="/">
            <i className="fas fa-star"></i>
            Little Stars Daycare
          </a>
          <div className="navbar-nav ms-auto d-flex flex-row gap-3 align-items-center">
            <button
              onClick={() => setShowTestModal(true)}
              className="btn btn-outline-primary btn-sm"
              style={{ fontSize: '13px' }}
            >
              <i className="fas fa-plus-circle me-1"></i>
              Test Enquiry
            </button>
            <a className="nav-link" href="/">
              <i className="fas fa-home me-1"></i>
              Home
            </a>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container-fluid mt-4" style={{ maxWidth: '1400px', flex: '1 0 auto' }}>
        
        {/* Flash Message Alert */}
        {flashMessage && (
          <div
            className={`alert alert-${flashMessage.type} alert-dismissible fade show`}
            role="alert"
          >
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
                  <i className="fas fa-envelope me-2" style={{ color: 'var(--accent-color)' }}></i>
                  Enquiries & Requests
                </h1>
                <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '14px' }}>
                  Manage all parent enquiries and requests
                </p>
              </div>
              <div className="d-flex gap-2 align-items-center">
                <button 
                  className="btn btn-outline-secondary btn-sm" 
                  onClick={fetchData}
                  disabled={isRefreshing}
                >
                  <i className={`fas fa-sync-alt ${isRefreshing ? 'fa-spin' : ''}`}></i>
                  Refresh
                </button>
                {tickets.length > 0 && (
                  <a href="/export_excel" className="btn btn-primary btn-sm">
                    <i className="fas fa-file-excel"></i>
                    Export Excel
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards (Starts at 0, shows Pending vs Dealt) */}
        <div className="row mb-4">
          <div className="col-md-3">
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
          <div className="col-md-3">
            <div className="stats-card">
              <div className="stats-icon" style={{ color: pendingCount > 0 ? '#f59e0b' : '#3b82f6' }}>
                <i className="fas fa-clock"></i>
              </div>
              <div className="stats-content">
                <h3 style={{ color: pendingCount > 0 ? '#b45309' : 'inherit' }}>{pendingCount}</h3>
                <p>Pending Enquiries</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
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
          <div className="col-md-3">
            <div className="stats-card">
              <div className="stats-icon">
                <i className="fas fa-users"></i>
              </div>
              <div className="stats-content">
                <h3>{uniqueParentsCount}</h3>
                <p>Unique Parents</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Enquiries Table Card */}
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h5 className="card-title mb-0" style={{ fontSize: '16px', fontWeight: 600 }}>
                  <i className="fas fa-list me-2" style={{ color: 'var(--accent-color)' }}></i>
                  Parent Enquiries
                </h5>

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

              <div className="card-body">
                {tickets.length > 0 ? (
                  <>
                    <div className="table-controls mb-3">
                      <div className="row">
                        <div className="col-md-6 mb-2 mb-md-0">
                          <input
                            type="text"
                            id="searchInput"
                            className="form-control"
                            placeholder="Search by name, email, or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <div className="col-md-6">
                          <select
                            id="countryFilter"
                            className="form-select"
                            value={countryFilter}
                            onChange={(e) => setCountryFilter(e.target.value)}
                          >
                            <option value="">All Enquiry Types</option>
                            {uniqueCountries.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table" id="ticketsTable">
                        <thead>
                          <tr>
                            <th style={{ width: '105px', textAlign: 'center' }} onClick={() => handleSort(0)}>
                              Tick / Done <i className="fas fa-sort"></i>
                            </th>
                            <th onClick={() => handleSort(1)}>
                              Name <i className="fas fa-sort"></i>
                            </th>
                            <th onClick={() => handleSort(2)}>
                              Email <i className="fas fa-sort"></i>
                            </th>
                            <th onClick={() => handleSort(3)}>
                              Phone <i className="fas fa-sort"></i>
                            </th>
                            <th onClick={() => handleSort(4)}>
                              Enquiry Type <i className="fas fa-sort"></i>
                            </th>
                            <th onClick={() => handleSort(5)}>
                              Request ID <i className="fas fa-sort"></i>
                            </th>
                            <th onClick={() => handleSort(6)}>
                              Date <i className="fas fa-sort"></i>
                            </th>
                            <th>Notes</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody id="ticketsTableBody">
                          {sortedTickets.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="text-center py-4 text-muted">
                                No enquiries match your current filters.
                              </td>
                            </tr>
                          ) : (
                            sortedTickets.map((ticket) => (
                              <tr 
                                key={ticket.id} 
                                style={{ 
                                  cursor: 'pointer',
                                  backgroundColor: ticket.dealt ? '#f8fafc' : '#ffffff',
                                  transition: 'background-color 0.2s ease'
                                }}
                                onClick={() => setSelectedTicket(ticket)}
                              >
                                {/* TICK / DEALT OPTION BUTTON */}
                                <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
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
                                      padding: '0.25rem 0.6rem',
                                      borderRadius: '6px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                      boxShadow: 'none'
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

                                <td>
                                  <strong style={{ color: ticket.dealt ? '#475569' : '#0f172a' }}>
                                    {ticket.name}
                                  </strong>
                                  {ticket.dealt && (
                                    <span className="badge bg-success ms-1.5" style={{ fontSize: '10px', padding: '0.2rem 0.4rem' }}>
                                      Done
                                    </span>
                                  )}
                                </td>

                                <td>
                                  <a 
                                    href={`mailto:${ticket.email}`}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ 
                                      color: ticket.dealt ? '#64748b' : 'inherit', 
                                      textDecoration: 'none' 
                                    }}
                                  >
                                    {ticket.email}
                                  </a>
                                </td>

                                <td>{ticket.phone || '-'}</td>

                                <td>
                                  <span style={{
                                    background: ticket.dealt ? '#f3f4f6' : '#fef3c7',
                                    color: ticket.dealt ? '#4b5563' : '#92400e',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600
                                  }}>
                                    {ticket.country || ticket.interest || 'General'}
                                  </span>
                                </td>

                                <td>
                                  <span style={{
                                    background: '#f8fafc',
                                    color: '#475569',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    fontFamily: "'Monaco', monospace",
                                    fontSize: '12px'
                                  }}>
                                    {ticket.ticket_number || ticket.id}
                                  </span>
                                </td>

                                <td>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                    {ticket.timestamp || ticket.createdAt?.slice(0, 10)}
                                  </span>
                                </td>

                                <td>
                                  <small style={{ color: 'var(--text-secondary)' }}>
                                    {ticket.region || ticket.message ? (
                                      (ticket.region || ticket.message)!.length > 40
                                        ? `${(ticket.region || ticket.message)!.slice(0, 40)}...`
                                        : (ticket.region || ticket.message)
                                    ) : (
                                      <em>No notes</em>
                                    )}
                                  </small>
                                </td>

                                <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => handleDeleteTicket(ticket.id, ticket.name)}
                                    title="Delete this enquiry"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                      <div>
                        <small className="text-muted">
                          Showing <span id="showingCount">{sortedTickets.length}</span> of {totalTickets} enquiries ({dealtCount} dealt with)
                        </small>
                      </div>
                      <div>
                        <button className="btn btn-outline-primary btn-sm" onClick={handleExportVisible}>
                          <i className="fas fa-download me-1"></i>
                          Export Visible
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-5">
                    <i className="fas fa-inbox fa-4x text-muted mb-3"></i>
                    <h4 className="text-muted">No Enquiries Yet</h4>
                    <p className="text-muted">All clear! When parents submit enquiries on your website, they will appear here.</p>
                    <button
                      className="btn btn-primary btn-sm mt-2"
                      onClick={() => setShowTestModal(true)}
                    >
                      <i className="fas fa-plus me-1"></i>
                      Send Test Enquiry
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Waiting List Section */}
        <div className="row mb-4 mt-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0" style={{ fontSize: '16px', fontWeight: 600 }}>
                  <i className="fas fa-clock me-2" style={{ color: 'var(--accent-color)' }}></i>
                  Waiting List for Enrolment
                  <span className="badge bg-primary ms-2">{totalWaiting}</span>
                </h5>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => setShowWaitingModal(true)}
                >
                  <i className="fas fa-user-plus me-1"></i>
                  Add to Waiting List
                </button>
              </div>
              <div className="card-body">
                {waitingList.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table" id="waitingTable">
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Contact/Website</th>
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
                    <i className="fas fa-clock fa-3x text-muted mb-3"></i>
                    <h5 className="text-muted">No one waiting yet</h5>
                    <p className="text-muted">Parents interested in enrolment will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="bg-dark text-light mt-5 py-4">
        <div className="container text-center">
          <p className="mb-0">
            <i className="fas fa-shield-alt me-2"></i>
            Little Stars Daycare - Enquiry Management System - Last updated: <span>{lastUpdated}</span>
          </p>
        </div>
      </footer>

      {/* Detail Modal with Tick Option */}
      {selectedTicket && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedTicket(null)}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header d-flex justify-content-between align-items-center">
                <h5 className="modal-title font-weight-bold">
                  <i className="fas fa-envelope me-2" style={{ color: 'var(--accent-color)' }}></i>
                  Enquiry Details: {selectedTicket.ticket_number}
                </h5>
                <button type="button" className="btn-close" onClick={() => setSelectedTicket(null)}></button>
              </div>
              <div className="modal-body">
                
                {/* Dealt / Tick Status Banner inside modal */}
                <div 
                  className={`p-3 rounded mb-3 d-flex justify-content-between align-items-center ${
                    selectedTicket.dealt ? 'bg-success-subtle border border-success' : 'bg-warning-subtle border border-warning'
                  }`}
                >
                  <div className="d-flex align-items-center gap-2">
                    <i className={`fas ${selectedTicket.dealt ? 'fa-check-circle text-success' : 'fa-clock text-warning'} fs-5`}></i>
                    <div>
                      <strong className={selectedTicket.dealt ? 'text-success' : 'text-dark'}>
                        {selectedTicket.dealt ? 'This enquiry has been dealt with' : 'Pending: Awaiting response'}
                      </strong>
                      <div className="small text-muted">
                        {selectedTicket.dealt ? 'Tick mark is active so you know it was handled.' : 'Tick the button when you have finished talking or replying to the parent.'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm ${selectedTicket.dealt ? 'btn-outline-secondary' : 'btn-success'}`}
                    onClick={() => handleToggleDealt(selectedTicket.id, !selectedTicket.dealt)}
                  >
                    <i className={`fas ${selectedTicket.dealt ? 'fa-undo' : 'fa-check'} me-1`}></i>
                    {selectedTicket.dealt ? 'Un-tick (Mark Pending)' : 'Tick as Dealt With'}
                  </button>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="text-muted small">Parent Name</label>
                    <p className="fw-bold fs-6 mb-0">{selectedTicket.name}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="text-muted small">Email Address</label>
                    <p className="fw-bold fs-6 mb-0">{selectedTicket.email}</p>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="text-muted small">Phone Number</label>
                    <p className="fw-bold mb-0">{selectedTicket.phone || 'Not provided'}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="text-muted small">Enquiry Type / Program</label>
                    <p className="fw-bold text-primary mb-0">{selectedTicket.country || selectedTicket.interest}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="text-muted small">Full Message / Notes</label>
                  <div className="p-3 bg-light rounded border">
                    {selectedTicket.region || selectedTicket.message || 'No additional message was written.'}
                  </div>
                </div>

                <div className="row text-muted small">
                  <div className="col-md-6">
                    <span>Received Date: {selectedTicket.timestamp}</span>
                  </div>
                  <div className="col-md-6">
                    <span>Source: {selectedTicket.source}</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <a
                  href={`mailto:${selectedTicket.email}?subject=Regarding%20your%20Little%20Stars%20Daycare%20Enquiry`}
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (!selectedTicket.dealt) {
                      handleToggleDealt(selectedTicket.id, true);
                    }
                  }}
                >
                  <i className="fas fa-reply me-1"></i>
                  Send Email & Mark Dealt
                </a>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedTicket(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Test Enquiry Modal */}
      {showTestModal && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowTestModal(false)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-paper-plane me-2 text-primary"></i>
                  Send Test Enquiry
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowTestModal(false)}></button>
              </div>
              <form onSubmit={handleSendTest}>
                <div className="modal-body">
                  <p className="text-muted small mb-3">
                    Sends a test parent inquiry to verify it appears in your admin table immediately.
                  </p>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Parent Name</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      required
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Parent Email</label>
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      required
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Phone Number</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Enquiry Type / Program</label>
                    <select
                      className="form-select form-select-sm"
                      value={testType}
                      onChange={(e) => setTestType(e.target.value)}
                    >
                      <option value="Infant Care Enrollment">Infant Care Enrollment</option>
                      <option value="Toddler Program Tour">Toddler Program Tour</option>
                      <option value="Full-Time Daycare">Full-Time Daycare</option>
                      <option value="After School Care">After School Care</option>
                      <option value="Weekend Workshop Experience">Weekend Workshop Experience</option>
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Notes / Message</label>
                    <textarea
                      rows={2}
                      className="form-control form-control-sm"
                      value={testNotes}
                      onChange={(e) => setTestNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowTestModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={testSending}>
                    {testSending ? 'Sending…' : 'Submit Test Enquiry'}
                  </button>
                </div>
              </form>
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
                    <label className="form-label small fw-bold">Parent Email Address</label>
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
                    <label className="form-label small fw-bold">Contact / Website / Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Toddler Room Interest / phone or note"
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
