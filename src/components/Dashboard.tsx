import React, { useState, useEffect, useCallback } from 'react';
import { backendService, getCaseId } from '../services/BackendService';
import type { CaseReport } from '../services/BackendService';
import { CaseDetailModal } from './CaseDetailModal';
import { SettingsPanel } from './SettingsPanel';
import { ReportFoundModal } from './ReportFoundModal';
import { ExportModal } from './ExportModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { StatsMap } from './StatsMap';
import { AnnouncementModal } from './AnnouncementModal';
import { 
  Users, ShieldAlert, CheckCircle, HelpCircle, Shield, UserCheck,
  RefreshCw, Settings, Search, Filter, AlertTriangle, CloudCheck, CloudOff, ListFilter,
  Download, Trash2, Map, LayoutList, Menu, X, CheckSquare, Square,
  MapPin, Check, Megaphone
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [reports, setReports] = useState<CaseReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<CaseReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  // Selection/Modals state
  const [selectedReport, setSelectedReport] = useState<CaseReport | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportFoundOpen, setIsReportFoundOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const [casesToDelete, setCasesToDelete] = useState<CaseReport[] | null>(null);
  const [configMode, setConfigMode] = useState<'mock' | 'live'>(backendService.getConfig().mode);

  // View state: 'queue' (moderation list/cards) or 'map' (interactive geographic stats map)
  const [activeTab, setActiveTab] = useState<'queue' | 'map'>('queue');
  // Card view vs Table view (mobile defaults to cards, desktop has both)
  const [viewFormat, setViewFormat] = useState<'cards' | 'table'>('cards');
  // Mobile sidebar drawer state
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Multi-selection for bulk operations (e.g. bulk delete)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter criteria
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [verificationFilter, setVerificationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Trigger temporary success notification
  const notifySuccess = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  // Fetch reports
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await backendService.fetchCases();
      setReports(data);
      // Clear selection if cases change
      setSelectedIds(new Set());
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An error occurred while fetching cases.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Apply filters whenever reports or criteria change
  useEffect(() => {
    let result = [...reports];

    // Filter by Search Query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.name.toLowerCase().includes(query) || 
        r.location.toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query) ||
        getCaseId(r).toLowerCase().includes(query)
      );
    }

    // Filter by Country
    if (countryFilter !== 'All') {
      result = result.filter(r => r.country === countryFilter);
    }

    // Filter by Verification Status
    if (verificationFilter !== 'All') {
      result = result.filter(r => r.verification_status === verificationFilter);
    }

    // Filter by Case Status
    if (statusFilter !== 'All') {
      result = result.filter(r => r.status === statusFilter);
    }

    setFilteredReports(result);
  }, [reports, searchQuery, countryFilter, verificationFilter, statusFilter]);

  // Analytics stats
  const totalCases = reports.length;
  const pendingCount = reports.filter(r => r.verification_status === 'Pending verification').length;
  const verifiedCount = reports.filter(r => r.verification_status === 'Verified').length;
  const foundCount = reports.filter(r => r.status === 'found').length;

  const handleConfigChanged = () => {
    setConfigMode(backendService.getConfig().mode);
    fetchReports();
  };

  // Selection handlers
  const toggleSelectOne = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredReports.length && filteredReports.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReports.map(r => r.id)));
    }
  };

  // Delete Handlers
  const handlePromptDeleteSingle = (report: CaseReport, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCasesToDelete([report]);
  };

  const handlePromptDeleteBatch = () => {
    const list = reports.filter(r => selectedIds.has(r.id));
    if (list.length > 0) {
      setCasesToDelete(list);
    }
  };

  const handleExecuteDelete = async () => {
    if (!casesToDelete || casesToDelete.length === 0) return;

    const { succeeded, failed } = await backendService.deleteCases(
      casesToDelete.map(c => ({ id: c.id, country: c.country }))
    );

    if (succeeded > 0) {
      notifySuccess(`Successfully deleted ${succeeded} missing person report(s) from database.`);
    }
    if (failed > 0) {
      setError(`Failed to delete ${failed} report(s). Check database permissions.`);
    }

    setCasesToDelete(null);
    setSelectedReport(null);
    fetchReports();
  };

  const getCountryBadge = (country: string) => {
    let cls = 'badge-country ';
    switch (country) {
      case 'South Africa': cls += 'badge-orange'; break;
      case 'Botswana': cls += 'badge-blue'; break;
      case 'Namibia': cls += 'badge-teal'; break;
      case 'Lesotho': cls += 'badge-red'; break;
      case 'Eswatini': cls += 'badge-purple'; break;
      default: cls += 'badge-gray'; break;
    }
    return <span className={`badge ${cls}`}>{country}</span>;
  };

  return (
    <div className="dashboard-container">
      {/* Mobile Top App Bar */}
      <div className="mobile-top-bar glass">
        <div className="mobile-brand">
          <Shield className="logo-icon-svg text-indigo" size={20} />
          <span className="mobile-app-title">Thuso Command Center</span>
        </div>
        <div className="mobile-bar-actions">
          <span className={`status-pill ${configMode === 'live' ? 'live' : 'mock'}`}>
            {configMode === 'live' ? 'Live' : 'Mock'}
          </span>
          <button 
            type="button" 
            className="mobile-menu-toggle"
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            aria-label="Toggle navigation menu"
          >
            {isMobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Sidebar (Responsive drawer on mobile) */}
      <aside className={`sidebar glass ${isMobileNavOpen ? 'mobile-nav-open' : ''}`}>
        <div className="sidebar-brand">
          <Shield className="logo-icon-svg text-indigo" size={24} />
          <h2>Thuso Command Center</h2>
          <button 
            className="sidebar-close-mobile" 
            onClick={() => setIsMobileNavOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="connection-status-card">
          <div className="status-indicator">
            {configMode === 'live' ? (
              <>
                <CloudCheck className="icon-green anim-pulse" />
                <div>
                  <span className="status-title">Live Mode</span>
                  <span className="status-details">Connected to 3 databases</span>
                </div>
              </>
            ) : (
              <>
                <CloudOff className="icon-orange" />
                <div>
                  <span className="status-title">Mock Mode</span>
                  <span className="status-details">Running locally</span>
                </div>
              </>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => { setActiveTab('queue'); setIsMobileNavOpen(false); }}
          >
            <Users size={18} />
            <span>Moderation Queue</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => { setActiveTab('map'); setIsMobileNavOpen(false); }}
          >
            <Map size={18} />
            <span>Stats Incident Map</span>
          </button>

          <button 
            className="nav-item" 
            onClick={() => { setIsExportOpen(true); setIsMobileNavOpen(false); }}
          >
            <Download size={18} />
            <span>Export Database</span>
          </button>

          <button 
            className="nav-item" 
            onClick={() => { setIsAnnouncementOpen(true); setIsMobileNavOpen(false); }}
          >
            <Megaphone size={18} />
            <span>Push Announcement</span>
          </button>

          <button 
            className="nav-item" 
            onClick={() => { setIsSettingsOpen(true); setIsMobileNavOpen(false); }}
          >
            <Settings size={18} />
            <span>Connection Settings</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <span className="version">v1.3.0-Production</span>
        </div>
      </aside>

      {/* Backdrop overlay for mobile drawer */}
      {isMobileNavOpen && (
        <div 
          className="mobile-backdrop" 
          onClick={() => setIsMobileNavOpen(false)} 
        />
      )}

      {/* Main Content Area */}
      <main className="main-content">
        {/* Success Toast Notification */}
        {successToast && (
          <div className="toast-notification glass anim-fade-in">
            <Check size={18} className="text-green" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Header */}
        <header className="dashboard-header glass">
          <div className="header-titles">
            <h1>Crisis Moderation & Dispatch</h1>
            <p className="subtitle">
              Verify reported missing persons, analyze regional hotspots, export registries, and dispatch updates
            </p>
          </div>

          <div className="header-actions">
            <button className="btn-secondary refresh-btn" onClick={fetchReports} disabled={isLoading}>
              <RefreshCw size={15} className={isLoading ? 'anim-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button className="btn-secondary" onClick={() => setIsExportOpen(true)}>
              <Download size={15} />
              <span>Export</span>
            </button>

            <button className="btn-primary btn-announce-action" onClick={() => setIsAnnouncementOpen(true)}>
              <Megaphone size={15} />
              <span>Announce</span>
            </button>

            <button className="btn-primary btn-found-action" onClick={() => setIsReportFoundOpen(true)}>
              <UserCheck size={15} />
              <span>Report Found</span>
            </button>

            <button className="btn-secondary settings-desktop-btn" onClick={() => setIsSettingsOpen(true)}>
              <Settings size={15} />
              <span>Settings</span>
            </button>
          </div>
        </header>

        {/* View Switcher Bar (Mobile & Desktop) */}
        <div className="view-mode-bar glass">
          <div className="view-mode-tabs">
            <button
              type="button"
              className={`view-tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
              onClick={() => setActiveTab('queue')}
            >
              <Users size={16} />
              <span>Cases Queue ({filteredReports.length})</span>
            </button>
            <button
              type="button"
              className={`view-tab-btn ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              <Map size={16} />
              <span>Regional Stats Map</span>
            </button>
          </div>

          {activeTab === 'queue' && (
            <div className="layout-format-toggle">
              <button
                type="button"
                className={`format-btn ${viewFormat === 'cards' ? 'active' : ''}`}
                onClick={() => setViewFormat('cards')}
                title="Cards View"
              >
                <LayoutList size={16} />
                <span className="format-label">Cards</span>
              </button>
              <button
                type="button"
                className={`format-btn ${viewFormat === 'table' ? 'active' : ''}`}
                onClick={() => setViewFormat('table')}
                title="Table View"
              >
                <ListFilter size={16} />
                <span className="format-label">Table</span>
              </button>
            </div>
          )}
        </div>

        {/* Analytics Statistics Panel (2x2 on mobile portrait, 4 col on desktop) */}
        <section className="stats-grid">
          <div className="stat-card glass">
            <div className="stat-icon-bg bg-purple">
              <Users size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Total Reports</span>
              <h2 className="stat-value">{totalCases}</h2>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon-bg bg-yellow">
              <AlertTriangle size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Pending Review</span>
              <h2 className="stat-value">{pendingCount}</h2>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon-bg bg-green">
              <CheckCircle size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Verified Listings</span>
              <h2 className="stat-value">{verifiedCount}</h2>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon-bg bg-blue">
              <ShieldAlert size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Cases Solved</span>
              <h2 className="stat-value">{foundCount}</h2>
            </div>
          </div>
        </section>

        {/* Demographics & Sex Statistics Panel */}
        {(() => {
          const maleCount = reports.filter(r => r.sex?.toLowerCase() === 'male').length;
          const femaleCount = reports.filter(r => r.sex?.toLowerCase() === 'female').length;
          const otherCount = totalCases - maleCount - femaleCount;

          const malePct = totalCases > 0 ? Math.round((maleCount / totalCases) * 100) : 0;
          const femalePct = totalCases > 0 ? Math.round((femaleCount / totalCases) * 100) : 0;
          const otherPct = totalCases > 0 ? Math.max(0, 100 - malePct - femalePct) : 0;

          return (
            <section className="demographics-panel glass">
              <div className="demographics-header">
                <h3>Case Demographics (Sex Distribution)</h3>
                <span className="demographics-summary">
                  Male: <strong>{maleCount}</strong> ({malePct}%) &bull; Female: <strong>{femaleCount}</strong> ({femalePct}%) &bull; Other: <strong>{otherCount}</strong> ({otherPct}%)
                </span>
              </div>
              <div className="gender-bar-wrapper">
                <div className="gender-progress-bar">
                  <div className="progress-segment segment-male" style={{ width: `${malePct}%` }} title={`Male: ${malePct}%`} />
                  <div className="progress-segment segment-female" style={{ width: `${femalePct}%` }} title={`Female: ${femalePct}%`} />
                  <div className="progress-segment segment-other" style={{ width: `${otherPct}%` }} title={`Other/Unknown: ${otherPct}%`} />
                </div>
                <div className="gender-legend">
                  <span className="legend-item"><span className="legend-dot dot-male"></span> Male ({maleCount})</span>
                  <span className="legend-item"><span className="legend-dot dot-female"></span> Female ({femaleCount})</span>
                  <span className="legend-item"><span className="legend-dot dot-other"></span> Other ({otherCount})</span>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Render either the Stats Map or the Moderation Queue */}
        {activeTab === 'map' ? (
          <StatsMap
            reports={reports}
            onSelectReport={report => setSelectedReport(report)}
            onFilterCountry={country => {
              setCountryFilter(country);
            }}
          />
        ) : (
          <>
            {/* Search and Filters Block */}
            <section className="filters-bar glass">
              <div className="search-box">
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search by name, location, case ID..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filters-dropdowns">
                <div className="filter-item">
                  <Filter size={14} />
                  <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
                    <option value="All">All Countries</option>
                    <option value="South Africa">South Africa (Firestore)</option>
                    <option value="Botswana">Botswana (Supabase)</option>
                    <option value="Namibia">Namibia (Supabase)</option>
                    <option value="Lesotho">Lesotho (Appwrite)</option>
                    <option value="Eswatini">Eswatini (Appwrite)</option>
                  </select>
                </div>

                <div className="filter-item">
                  <ListFilter size={14} />
                  <select value={verificationFilter} onChange={e => setVerificationFilter(e.target.value)}>
                    <option value="All">All Verifications</option>
                    <option value="Pending verification">Pending Verification</option>
                    <option value="Verified">Verified</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div className="filter-item">
                  <ListFilter size={14} />
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="All">All Case Statuses</option>
                    <option value="missing">🔴 Missing</option>
                    <option value="found">🟢 Found</option>
                    <option value="closed">⚪ Closed</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Error Alert */}
            {error && (
              <div className="error-alert glass">
                <HelpCircle size={20} />
                <div>
                  <h3>Database Communication Notice</h3>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Batch Action Bar if items selected */}
            {selectedIds.size > 0 && (
              <div className="batch-action-bar glass anim-fade-in">
                <div className="batch-info">
                  <CheckSquare size={18} className="text-indigo" />
                  <span><strong>{selectedIds.size}</strong> report(s) selected</span>
                </div>
                <div className="batch-buttons">
                  <button 
                    type="button" 
                    className="btn-secondary btn-sm"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Deselect All
                  </button>
                  <button 
                    type="button" 
                    className="btn-danger btn-sm"
                    onClick={handlePromptDeleteBatch}
                  >
                    <Trash2 size={14} />
                    Delete Selected ({selectedIds.size})
                  </button>
                </div>
              </div>
            )}

            {/* Cases Presentation: Cards or Table */}
            {viewFormat === 'cards' ? (
              /* Mobile/Card Grid View */
              <section className="cases-cards-grid">
                {filteredReports.length > 0 ? (
                  filteredReports.map((report) => {
                    const isSelected = selectedIds.has(report.id);
                    return (
                      <div 
                        key={report.id} 
                        className={`case-card-mobile glass ${isSelected ? 'card-selected' : ''}`}
                        onClick={() => setSelectedReport(report)}
                      >
                        <div className="card-top-row">
                          <button
                            type="button"
                            className="card-select-btn"
                            onClick={(e) => toggleSelectOne(report.id, e)}
                            title={isSelected ? 'Deselect' : 'Select'}
                          >
                            {isSelected ? (
                              <CheckSquare size={18} className="text-indigo" />
                            ) : (
                              <Square size={18} className="text-muted" />
                            )}
                          </button>
                          
                          <div className="card-avatar-wrapper">
                            {report.photo_url ? (
                              <img 
                                src={report.photo_url} 
                                alt={report.name}
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.style.display = 'none';
                                  if (target.parentElement && !target.parentElement.querySelector('.avatar-placeholder')) {
                                    const fb = document.createElement('div');
                                    fb.className = 'avatar-placeholder';
                                    fb.textContent = '👤';
                                    target.parentElement.appendChild(fb);
                                  }
                                }}
                              />
                            ) : (
                              <div className="avatar-placeholder">👤</div>
                            )}
                          </div>

                          <div className="card-identity">
                            <h3 className="card-person-name">{report.name}</h3>
                            <span className="card-case-id">Case: {getCaseId(report)}</span>
                            <div className="card-age-sex">
                              <span>{report.age} yrs</span> &bull; <span>{report.sex || 'Unknown'}</span>
                            </div>
                          </div>

                          <div className="card-status-pill">
                            <span className={`badge badge-status ${
                              report.status === 'missing' ? 'badge-status-missing' : 
                              report.status === 'found' ? 'badge-status-found' : 'badge-status-closed'
                            }`}>
                              {report.status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="card-body-details">
                          <div className="card-detail-item">
                            <MapPin size={14} className="text-muted" />
                            <span>{report.location}</span>
                          </div>
                          <div className="card-badge-row">
                            {getCountryBadge(report.country)}
                            <span className={`badge badge-verification ${
                              report.verification_status === 'Verified' ? 'badge-green' : 
                              report.verification_status === 'Rejected' ? 'badge-red' : 'badge-yellow'
                            }`}>
                              {report.verification_status}
                            </span>
                          </div>
                        </div>

                        <div className="card-footer-actions" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn-card-action btn-card-review"
                            onClick={() => setSelectedReport(report)}
                          >
                            Review Details
                          </button>
                          <button
                            type="button"
                            className="btn-card-action btn-card-delete"
                            onClick={(e) => handlePromptDeleteSingle(report, e)}
                            title="Delete this report"
                          >
                            <Trash2 size={16} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-state glass">
                    <Users size={48} />
                    <p>No reports match selected filters or search parameters.</p>
                  </div>
                )}
              </section>
            ) : (
              /* Desktop / Wide Table View */
              <section className="cases-table-wrapper glass">
                <table className="cases-table">
                  <thead>
                    <tr>
                      <th className="select-col-header">
                        <button
                          type="button"
                          className="header-select-btn"
                          onClick={toggleSelectAll}
                          title="Select all"
                        >
                          {selectedIds.size === filteredReports.length && filteredReports.length > 0 ? (
                            <CheckSquare size={16} className="text-indigo" />
                          ) : (
                            <Square size={16} className="text-muted" />
                          )}
                        </button>
                      </th>
                      <th>Person</th>
                      <th>Age / Sex</th>
                      <th>Country / Source</th>
                      <th>Last Seen Location</th>
                      <th>Verification</th>
                      <th>Listing Status</th>
                      <th>Date Reported</th>
                      <th className="actions-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.length > 0 ? (
                      filteredReports.map((report) => {
                        const isSelected = selectedIds.has(report.id);
                        return (
                          <tr key={report.id} className={`case-row ${isSelected ? 'row-selected' : ''}`}>
                            <td className="select-cell">
                              <button
                                type="button"
                                className="row-select-btn"
                                onClick={(e) => toggleSelectOne(report.id, e)}
                              >
                                {isSelected ? (
                                  <CheckSquare size={16} className="text-indigo" />
                                ) : (
                                  <Square size={16} className="text-muted" />
                                )}
                              </button>
                            </td>
                            <td className="person-cell">
                              <div className="avatar-wrapper">
                                {report.photo_url ? (
                                  <img 
                                    src={report.photo_url} 
                                    alt={report.name}
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      target.style.display = 'none';
                                      if (target.parentElement && !target.parentElement.querySelector('.avatar-placeholder')) {
                                        const fb = document.createElement('div');
                                        fb.className = 'avatar-placeholder';
                                        fb.textContent = '👤';
                                        target.parentElement.appendChild(fb);
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="avatar-placeholder">👤</div>
                                )}
                              </div>
                              <div className="person-name-group">
                                <span className="person-name">{report.name}</span>
                                <span className="case-mini-id">Case: {getCaseId(report)}</span>
                              </div>
                            </td>
                            <td className="age-cell">
                              <div className="age-text">{report.age} yrs</div>
                              <div className="gender-text">{report.sex || 'Unknown'}</div>
                            </td>
                            <td>{getCountryBadge(report.country)}</td>
                            <td className="location-cell">{report.location}</td>
                            <td>
                              <span className={`badge badge-verification ${
                                report.verification_status === 'Verified' ? 'badge-green' : 
                                report.verification_status === 'Rejected' ? 'badge-red' : 'badge-yellow'
                              }`}>
                                {report.verification_status}
                              </span>
                            </td>
                            <td>
                              <span className={`badge badge-status ${
                                report.status === 'missing' ? 'badge-status-missing' : 
                                report.status === 'found' ? 'badge-status-found' : 'badge-status-closed'
                              }`}>
                                {report.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="date-cell">
                              {new Date(report.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                            </td>
                            <td className="actions-cell">
                              <div className="table-actions-group">
                                <button 
                                  className="btn-action-view" 
                                  onClick={() => setSelectedReport(report)}
                                >
                                  Review
                                </button>
                                <button
                                  className="btn-action-delete"
                                  onClick={(e) => handlePromptDeleteSingle(report, e)}
                                  title="Delete case"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="empty-state">
                          <Users size={48} />
                          <p>No reports match selected filters or search parameters.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}
      </main>

      {/* Case Details Modal */}
      {selectedReport && (
        <CaseDetailModal 
          report={selectedReport} 
          onClose={() => setSelectedReport(null)} 
          onUpdated={fetchReports}
          onDelete={(report) => handlePromptDeleteSingle(report)}
        />
      )}

      {/* Report Person Found Modal */}
      {isReportFoundOpen && (
        <ReportFoundModal 
          reports={reports} 
          onClose={() => setIsReportFoundOpen(false)} 
          onSuccess={fetchReports} 
        />
      )}

      {/* Connection Settings Modal */}
      {isSettingsOpen && (
        <SettingsPanel 
          onClose={() => setIsSettingsOpen(false)} 
          onConfigChanged={handleConfigChanged} 
        />
      )}

      {/* Export Data Modal */}
      {isExportOpen && (
        <ExportModal
          allReports={reports}
          filteredReports={filteredReports}
          onClose={() => setIsExportOpen(false)}
          databaseMode={configMode}
        />
      )}

      {/* Delete Confirmation Modal */}
      {casesToDelete && (
        <DeleteConfirmModal
          casesToDelete={casesToDelete}
          onClose={() => setCasesToDelete(null)}
          onConfirm={handleExecuteDelete}
        />
      )}

      {/* Push Announcement Modal */}
      {isAnnouncementOpen && (
        <AnnouncementModal
          reports={reports}
          onClose={() => setIsAnnouncementOpen(false)}
          onSuccess={(msg) => notifySuccess(msg)}
        />
      )}
    </div>
  );
};

export default Dashboard;
