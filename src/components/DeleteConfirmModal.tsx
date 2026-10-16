import React, { useState } from 'react';
import type { CaseReport } from '../services/BackendService';
import { getCaseId } from '../services/BackendService';
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';

interface DeleteConfirmModalProps {
  casesToDelete: CaseReport[];
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  casesToDelete,
  onClose,
  onConfirm
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isMultiple = casesToDelete.length > 1;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await onConfirm();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to delete case(s). Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass delete-modal-content">
        <div className="modal-header">
          <div className="flex-header-title text-red">
            <ShieldAlert size={24} />
            <h2>{isMultiple ? `Delete ${casesToDelete.length} Missing Reports?` : 'Delete Missing Report?'}</h2>
          </div>
          <button className="close-btn" onClick={onClose} disabled={isDeleting}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="delete-warning-banner">
            <AlertTriangle size={24} className="icon-warning" />
            <p>
              <strong>Warning:</strong> This will permanently remove {isMultiple ? 'these cases' : 'this case'} and any linked uploaded photo. This action cannot be reversed.
            </p>
          </div>

          {errorMsg && (
            <div className="alert alert-danger mt-4">
              <span style={{ whiteSpace: 'pre-line' }}>{errorMsg}</span>
            </div>
          )}

          <div className="delete-target-preview">
            <label className="preview-label">Case(s) to be removed:</label>
            <div className="delete-cases-list">
              {casesToDelete.slice(0, 5).map(c => (
                <div key={c.id} className="delete-case-item">
                  <div className="delete-case-avatar">
                    {c.photo_url ? (
                      <img 
                        src={c.photo_url} 
                        alt={c.name} 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.parentElement && !e.currentTarget.parentElement.querySelector('span')) {
                            const s = document.createElement('span');
                            s.textContent = '👤';
                            e.currentTarget.parentElement.appendChild(s);
                          }
                        }}
                      />
                    ) : (
                      <span>👤</span>
                    )}
                  </div>
                  <div className="delete-case-info">
                    <span className="case-item-name">{c.name}</span>
                    <span className="case-item-meta">
                      ID: {getCaseId(c)} &bull; {c.country} &bull; {c.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
              {casesToDelete.length > 5 && (
                <div className="more-cases-text">
                  ...and {casesToDelete.length - 5} more case(s)
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 size={16} />
            {isDeleting ? 'Deleting...' : isMultiple ? `Delete ${casesToDelete.length} Reports` : 'Permanently Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
