import React, { useState } from 'react';
import type { CaseReport } from '../services/BackendService';
import { getCaseId } from '../services/BackendService';
import { Download, FileSpreadsheet, FileJson, Printer, Check, ShieldCheck, Database, Layers } from 'lucide-react';

interface ExportModalProps {
  allReports: CaseReport[];
  filteredReports: CaseReport[];
  onClose: () => void;
  databaseMode: 'live' | 'mock';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  allReports,
  filteredReports,
  onClose,
  databaseMode
}) => {
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const targetData = exportScope === 'filtered' ? filteredReports : allReports;

  const escapeCsv = (str: string | number | null | undefined): string => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const handleExportCSV = () => {
    if (targetData.length === 0) return;

    const headers = [
      'Case ID',
      'Full Name',
      'Age',
      'Sex',
      'Country',
      'Province / State',
      'Last Seen Location',
      'Case Status',
      'Verification Status',
      'Date Reported',
      'Emergency Contact Name',
      'Emergency Contact Phone',
      'Case Description / Circumstances',
      'Photo URL'
    ];

    const rows = targetData.map(r => [
      escapeCsv(getCaseId(r)),
      escapeCsv(r.name),
      escapeCsv(r.age),
      escapeCsv(r.sex || 'Unknown'),
      escapeCsv(r.country),
      escapeCsv(r.province || ''),
      escapeCsv(r.location),
      escapeCsv(r.status.toUpperCase()),
      escapeCsv(r.verification_status),
      escapeCsv(new Date(r.created_at).toLocaleString()),
      escapeCsv(r.contact_name),
      escapeCsv(r.contact_phone),
      escapeCsv(r.details),
      escapeCsv(r.photo_url || '')
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `thuso_missing_cases_${exportScope}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(`Exported ${targetData.length} records as CSV`);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleExportJSON = () => {
    if (targetData.length === 0) return;

    const exportPayload = {
      exported_at: new Date().toISOString(),
      database_mode: databaseMode,
      scope: exportScope,
      total_cases: targetData.length,
      cases: targetData.map(r => ({
        ...r,
        formatted_case_id: getCaseId(r),
        reported_date_readable: new Date(r.created_at).toLocaleString()
      }))
    };

    const jsonString = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `thuso_missing_cases_${exportScope}_${dateStr}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(`Exported ${targetData.length} records as JSON`);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handlePrintSummary = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = targetData.map((r, i) => `
      <tr style="border-bottom: 1px solid #ddd; ${i % 2 === 1 ? 'background-color: #f9f9f9;' : ''}">
        <td style="padding: 8px; font-weight: bold; font-family: monospace;">${getCaseId(r)}</td>
        <td style="padding: 8px; font-weight: 600;">${r.name}</td>
        <td style="padding: 8px;">${r.age} yrs (${r.sex || 'Unknown'})</td>
        <td style="padding: 8px;">${r.country}</td>
        <td style="padding: 8px;">${r.location}</td>
        <td style="padding: 8px;">
          <span style="display:inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; color: ${r.status === 'missing' ? '#b91c1c' : '#047857'}; background: ${r.status === 'missing' ? '#fee2e2' : '#d1fae5'};">
            ${r.status.toUpperCase()}
          </span>
        </td>
        <td style="padding: 8px; font-size: 12px;">${r.verification_status}</td>
        <td style="padding: 8px; font-size: 12px;">${r.contact_name ? `${r.contact_name} (${r.contact_phone})` : 'N/A'}</td>
        <td style="padding: 8px; font-size: 11px; color: #555;">${new Date(r.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Thuso Crisis Moderation - Case Registry Export</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
            h1 { margin-bottom: 4px; font-size: 22px; color: #0f172a; }
            .header-meta { font-size: 13px; color: #64748b; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
            th { background-color: #f1f5f9; padding: 10px 8px; border-bottom: 2px solid #cbd5e1; font-weight: 600; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
            <div>
              <h1>Thuso Command Center — Crisis Report Registry</h1>
              <div class="header-meta">
                Generated: ${new Date().toLocaleString()} &bull; Total Cases: ${targetData.length} &bull; Scope: ${exportScope.toUpperCase()}
              </div>
            </div>
            <button onclick="window.print()" style="padding: 8px 16px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Print / Save PDF</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Person Name</th>
                <th>Demographics</th>
                <th>Country</th>
                <th>Location</th>
                <th>Status</th>
                <th>Verification</th>
                <th>Contact</th>
                <th>Reported</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass export-modal-content">
        <div className="modal-header">
          <div className="flex-header-title">
            <Download size={22} className="text-indigo" />
            <div>
              <h2>Export Database Reports</h2>
              <span className="modal-subtitle">Download formatted crisis data for spreadsheets, records, or printing</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {downloadSuccess && (
            <div className="alert alert-success">
              <Check size={18} />
              <span>{downloadSuccess}</span>
            </div>
          )}

          {/* Scope Selector */}
          <div className="export-section">
            <label className="section-label">1. Choose Export Scope</label>
            <div className="export-scope-toggle">
              <button
                type="button"
                className={`scope-pill-btn ${exportScope === 'filtered' ? 'active' : ''}`}
                onClick={() => setExportScope('filtered')}
              >
                <Layers size={16} />
                <div className="scope-text">
                  <span className="scope-title">Current Filtered View</span>
                  <span className="scope-count">{filteredReports.length} records</span>
                </div>
              </button>

              <button
                type="button"
                className={`scope-pill-btn ${exportScope === 'all' ? 'active' : ''}`}
                onClick={() => setExportScope('all')}
              >
                <Database size={16} />
                <div className="scope-text">
                  <span className="scope-title">All Database Records</span>
                  <span className="scope-count">{allReports.length} records</span>
                </div>
              </button>
            </div>
          </div>

          {/* Format Options */}
          <div className="export-section mt-4">
            <label className="section-label">2. Select Export Format</label>
            <div className="export-format-grid">
              {/* CSV Card */}
              <div className="format-card" onClick={handleExportCSV}>
                <div className="format-icon-wrapper bg-green-subtle">
                  <FileSpreadsheet size={28} className="text-green" />
                </div>
                <div className="format-details">
                  <h3>CSV / Excel Spreadsheet</h3>
                  <p>Formatted comma-separated file with readable headers, ideal for Microsoft Excel, Google Sheets, and Numbers.</p>
                  <button type="button" className="btn-format-download btn-green">
                    <Download size={14} /> Download .CSV
                  </button>
                </div>
              </div>

              {/* JSON Card */}
              <div className="format-card" onClick={handleExportJSON}>
                <div className="format-icon-wrapper bg-indigo-subtle">
                  <FileJson size={28} className="text-indigo" />
                </div>
                <div className="format-details">
                  <h3>Structured JSON</h3>
                  <p>Clean, pretty-printed JSON structure with full metadata, ideal for technical audits and database backups.</p>
                  <button type="button" className="btn-format-download btn-indigo">
                    <Download size={14} /> Download .JSON
                  </button>
                </div>
              </div>

              {/* Printable PDF View */}
              <div className="format-card" onClick={handlePrintSummary}>
                <div className="format-icon-wrapper bg-blue-subtle">
                  <Printer size={28} className="text-blue" />
                </div>
                <div className="format-details">
                  <h3>Printable Registry / PDF</h3>
                  <p>Opens a clean, printable tabular document ready for browser print or saving as a formatted PDF report.</p>
                  <button type="button" className="btn-format-download btn-blue">
                    <Printer size={14} /> Open Print / PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="export-footer-info">
            <ShieldCheck size={16} className="text-muted" />
            <span>Exported files respect current database sanitization and Southern African regional case identifiers.</span>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
