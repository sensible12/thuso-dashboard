import React, { useState } from 'react';
import { backendService } from '../services/BackendService';
import type { CaseReport } from '../services/BackendService';
import { CheckCircle2, AlertCircle, UserCheck, Phone, MapPin, Calendar, FileText } from 'lucide-react';

interface ReportFoundModalProps {
  reports: CaseReport[];
  onClose: () => void;
  onSuccess: () => void;
}

export const ReportFoundModal: React.FC<ReportFoundModalProps> = ({ reports, onClose, onSuccess }) => {
  // Filter only active missing cases
  const missingCases = reports.filter(r => r.status === 'missing');

  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    missingCases.length > 0 ? missingCases[0].id : ''
  );
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [locationFound, setLocationFound] = useState('');
  const [dateFound, setDateFound] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) {
      setErrorMsg('Please select a missing person report.');
      return;
    }
    if (!reporterName.trim() || !reporterContact.trim()) {
      setErrorMsg('Reporter name and contact information are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const selectedCase = reports.find(r => r.id === selectedCaseId);
      if (!selectedCase) {
        throw new Error('Selected case not found in reports list.');
      }

      // Compile detailed reporter description for system logs
      const combinedNotes = `Found at: ${locationFound || 'Not specified'} on ${dateFound}. Submitter notes: ${notes || 'No extra notes provided.'}`;

      const res = await backendService.reportPersonFound(
        selectedCase.id,
        selectedCase.country,
        selectedCase.details,
        reporterName,
        reporterContact,
        combinedNotes
      );

      if (res) {
        setSuccessMsg(`Thank you. The report for ${selectedCase.name} has been successfully updated to "Found" and logged.`);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 3000);
      } else {
        setErrorMsg('Failed to update case status. Please verify backend connections.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Report Missing Person Found</h2>
          <button className="close-btn" onClick={onClose} disabled={isSubmitting}>&times;</button>
        </div>

        <div className="modal-body">
          {successMsg ? (
            <div className="success-state-container">
              <CheckCircle2 size={64} className="icon-green anim-pulse" />
              <h3>Status Updated Successfully</h3>
              <p>{successMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="report-found-form">
              <p className="form-info-text">
                Use this form to notify the dashboard command center that a missing person listed on our platforms has been located.
              </p>

              {errorMsg && (
                <div className="alert alert-danger">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Case Selector */}
              <div className="form-group mb-4">
                <label className="form-label-styled">Select Missing Person</label>
                {missingCases.length === 0 ? (
                  <div className="no-cases-alert">
                    No active missing cases found.
                  </div>
                ) : (
                  <select
                    className="status-select"
                    value={selectedCaseId}
                    onChange={e => setSelectedCaseId(e.target.value)}
                    disabled={isSubmitting}
                  >
                    {missingCases.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.age} yrs, {c.location}) - {c.country}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Submitter Details */}
              <div className="form-grid mb-4">
                <div className="form-group">
                  <label className="form-label-styled">
                    <UserCheck size={14} className="label-icon" /> Reporter Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Inspector Ndlovu / Parent"
                    value={reporterName}
                    onChange={e => setReporterName(e.target.value)}
                    disabled={isSubmitting || missingCases.length === 0}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label-styled">
                    <Phone size={14} className="label-icon" /> Contact Info (Phone/Email)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +27 83 123 4567"
                    value={reporterContact}
                    onChange={e => setReporterContact(e.target.value)}
                    disabled={isSubmitting || missingCases.length === 0}
                    required
                  />
                </div>
              </div>

              {/* Find Location & Date */}
              <div className="form-grid mb-4">
                <div className="form-group">
                  <label className="form-label-styled">
                    <MapPin size={14} className="label-icon" /> Where Found (City/Area)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pretoria Central"
                    value={locationFound}
                    onChange={e => setLocationFound(e.target.value)}
                    disabled={isSubmitting || missingCases.length === 0}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label-styled">
                    <Calendar size={14} className="label-icon" /> Date Found
                  </label>
                  <input
                    type="date"
                    value={dateFound}
                    onChange={e => setDateFound(e.target.value)}
                    disabled={isSubmitting || missingCases.length === 0}
                  />
                </div>
              </div>

              {/* Additional Notes */}
              <div className="form-group mb-4">
                <label className="form-label-styled">
                  <FileText size={14} className="label-icon" /> Verification Details / Notes
                </label>
                <textarea
                  className="form-textarea-styled"
                  placeholder="Provide any additional notes (e.g. Safe and reunited with family, found by community patrol, etc.)"
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  disabled={isSubmitting || missingCases.length === 0}
                />
              </div>

              <div className="action-buttons-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary btn-found-submit"
                  disabled={isSubmitting || missingCases.length === 0}
                >
                  {isSubmitting ? 'Submitting Report...' : 'Submit Found Report'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
