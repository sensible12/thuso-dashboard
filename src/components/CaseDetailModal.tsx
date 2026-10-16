import React, { useState } from 'react';
import { backendService, getCaseId } from '../services/BackendService';
import type { CaseReport } from '../services/BackendService';
import { ShieldCheck, UserX, AlertCircle, Phone, MapPin, Calendar, User, UserCheck, Trash2 } from 'lucide-react';

interface CaseDetailModalProps {
  report: CaseReport;
  onClose: () => void;
  onUpdated: () => void;
  onDelete?: (report: CaseReport) => void;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({ report, onClose, onUpdated, onDelete }) => {
  const [verStatus, setVerStatus] = useState<CaseReport['verification_status']>(report.verification_status);
  const [caseStatus, setCaseStatus] = useState<CaseReport['status']>(report.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      let success = true;

      // Update verification status if it changed
      if (verStatus !== report.verification_status) {
        const res = await backendService.updateCaseVerification(report.id, report.country, verStatus);
        if (!res) success = false;
      }

      // Update case status if it changed
      if (caseStatus !== report.status) {
        const res = await backendService.updateCaseStatus(report.id, report.country, caseStatus);
        if (!res) success = false;
      }

      if (success) {
        onUpdated();
        onClose();
      } else {
        setErrorMsg('Failed to update case parameters on database. Check connection or access policies.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'An error occurred during modification.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper for color coding countries
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
    <div className="modal-overlay">
      <div className="modal-content glass">
        <div className="modal-header">
          <h2>Case Moderation Details</h2>
          <button className="close-btn" onClick={onClose} disabled={isUpdating}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="case-detail-grid">
            {/* Left Column: Photo & Quick Statuses */}
            <div className="detail-photo-panel">
              <div className="photo-container">
                {report.photo_url ? (
                  <img 
                    src={report.photo_url} 
                    alt={report.name}
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      if (target.parentElement && !target.parentElement.querySelector('.no-photo')) {
                        const fb = document.createElement('div');
                        fb.className = 'no-photo';
                        fb.innerHTML = '<span style="font-size: 3rem;">👤</span><span>Photo not reachable</span>';
                        target.parentElement.appendChild(fb);
                      }
                    }} 
                  />
                ) : (
                  <div className="no-photo">
                    <User size={64} />
                    <span>No Image Uploaded</span>
                  </div>
                )}
              </div>
              <div className="quick-tags mt-4">
                <div className="tag-row">
                  <span className="tag-label">Country:</span>
                  {getCountryBadge(report.country)}
                </div>
                <div className="tag-row mt-2">
                  <span className="tag-label">Verification:</span>
                  <span className={`badge badge-verification ${
                    report.verification_status === 'Verified' ? 'badge-green' : 
                    report.verification_status === 'Rejected' ? 'badge-red' : 'badge-yellow'
                  }`}>
                    {report.verification_status}
                  </span>
                </div>
                <div className="tag-row mt-2">
                  <span className="tag-label">Case Status:</span>
                  <span className={`badge badge-status ${
                    report.status === 'missing' ? 'badge-status-missing' : 
                    report.status === 'found' ? 'badge-status-found' : 'badge-status-closed'
                  }`}>
                    {report.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Case Info & Controls */}
            <div className="detail-info-panel">
              <div className="info-section">
                <span className="case-id">Case No: {getCaseId(report)}</span>
                <h1 className="case-name">{report.name}</h1>
                <p className="case-age">
                  Age: <strong>{report.age} years old</strong> &nbsp;&bull;&nbsp; 
                  Sex: <strong>{report.sex || 'Unknown'}</strong>
                </p>
              </div>

              <div className="info-block-list">
                <div className="info-block">
                  <MapPin size={18} />
                  <div>
                    <label>Last Seen Location</label>
                    <p>{report.location}</p>
                  </div>
                </div>

                <div className="info-block">
                  <Calendar size={18} />
                  <div>
                    <label>Date Reported</label>
                    <p>{formatDate(report.created_at)}</p>
                  </div>
                </div>

                <div className="info-block">
                  <Phone size={18} />
                  <div>
                    <label>Emergency Contact</label>
                    <p><strong>{report.contact_name || 'N/A'}</strong> ({report.contact_phone || 'No phone'})</p>
                  </div>
                </div>
              </div>

              <div className="description-box">
                <label>Case Details / Description</label>
                <p>{report.details || 'No additional details provided.'}</p>
              </div>

              {/* Moderation Controls Form */}
              <div className="moderation-controls-panel">
                <h3>Moderator Verdict Controls</h3>

                {errorMsg && (
                  <div className="alert alert-danger">
                    <AlertCircle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="controls-row">
                  <div className="control-group">
                    <label>Verification Status</label>
                    <div className="verdict-buttons">
                      <button 
                        type="button" 
                        className={`btn-verdict btn-verify ${verStatus === 'Verified' ? 'active' : ''}`}
                        onClick={() => setVerStatus('Verified')}
                      >
                        <ShieldCheck size={16} />
                        Verify Case
                      </button>
                      <button 
                        type="button" 
                        className={`btn-verdict btn-reject ${verStatus === 'Rejected' ? 'active' : ''}`}
                        onClick={() => setVerStatus('Rejected')}
                      >
                        <UserX size={16} />
                        Reject Case
                      </button>
                      <button 
                        type="button" 
                        className={`btn-verdict btn-pending ${verStatus === 'Pending verification' ? 'active' : ''}`}
                        onClick={() => setVerStatus('Pending verification')}
                      >
                        <UserCheck size={16} />
                        Pending
                      </button>
                    </div>
                  </div>

                  <div className="control-group">
                    <label>Case Status Override</label>
                    <select 
                      value={caseStatus} 
                      onChange={e => setCaseStatus(e.target.value as CaseReport['status'])}
                      className="status-select"
                    >
                      <option value="missing">🔴 Missing / Active</option>
                      <option value="found">🟢 Found / Solved</option>
                      <option value="closed">⚪ Closed / Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="action-buttons-row">
                  {onDelete && (
                    <button
                      type="button"
                      className="btn-danger-outline"
                      onClick={() => onDelete(report)}
                      disabled={isUpdating}
                    >
                      <Trash2 size={16} />
                      Delete Report
                    </button>
                  )}
                  <div className="action-buttons-right">
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={onClose}
                      disabled={isUpdating}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="btn-primary" 
                      onClick={handleUpdate}
                      disabled={isUpdating || (verStatus === report.verification_status && caseStatus === report.status)}
                    >
                      {isUpdating ? 'Saving Modifications...' : 'Apply Modifications'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
