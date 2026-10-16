import React, { useState } from 'react';
import type { CaseReport, AnnouncementPayload, AnnouncementHistoryItem } from '../services/BackendService';
import { backendService, getCaseId } from '../services/BackendService';
import { 
  Megaphone, Send, AlertTriangle, CheckCircle2, ShieldAlert, 
  Smartphone, History, Sparkles, UserCheck, Bell, Info, Shield
} from 'lucide-react';

interface AnnouncementModalProps {
  reports: CaseReport[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ reports, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

  // Form states
  const [category, setCategory] = useState<AnnouncementPayload['category']>('safety_alert');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [targetTopic, setTargetTopic] = useState('global-missing-person-alerts');
  const [senderName, setSenderName] = useState('Thuso Command Center');

  // Execution states
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<AnnouncementHistoryItem[]>(() => 
    backendService.getAnnouncementHistory()
  );

  // Presets
  const applyPreset = (presetType: 'urgent_search' | 'person_found' | 'weather_alert' | 'community_meeting') => {
    switch (presetType) {
      case 'urgent_search':
        setCategory('safety_alert');
        setTitle('🚨 Urgent Volunteer Ground Search Alert');
        setMessage('Urgent call for community volunteers to assist local authorities in active search operations. Please report any leads immediately.');
        break;
      case 'person_found':
        setCategory('person_found');
        setTitle('🟢 Missing Person Safely Located!');
        setMessage('Great news: The reported missing person has been located safe and reunited with family. Thank you to everyone who assisted.');
        break;
      case 'weather_alert':
        setCategory('general');
        setTitle('⚠️ Search Area Weather Advisory');
        setMessage('Severe weather conditions reported across the active search sector. Search teams are advised to proceed with extreme caution.');
        break;
      case 'community_meeting':
        setCategory('community_update');
        setTitle('📢 Community ground search briefing');
        setMessage('Local community members are invited to the regional command post for an urgent case update and coordinated search patrol briefing.');
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setErrorMsg('Please enter both an announcement title and message.');
      return;
    }

    setIsSending(true);
    setErrorMsg(null);

    try {
      const linkedCase = reports.find(r => r.id === selectedCaseId);

      const payload: AnnouncementPayload = {
        title: title.trim(),
        message: message.trim(),
        category,
        targetTopic,
        reportId: linkedCase ? linkedCase.id : undefined,
        photoUrl: linkedCase?.photo_url || undefined,
        senderName: senderName.trim() || 'Thuso Command Center'
      };

      const res = await backendService.sendAnnouncement(payload);

      if (res.success) {
        onSuccess(`Announcement "${title.trim()}" dispatched to all user phones via FCM!`);
        setHistoryItems(backendService.getAnnouncementHistory());
        onClose();
      } else {
        setErrorMsg(res.error || 'Failed to dispatch push announcement. Verify backend connection.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSending(false);
    }
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'safety_alert': return 'badge-cat-alert';
      case 'person_found': return 'badge-cat-found';
      case 'community_update': return 'badge-cat-community';
      default: return 'badge-cat-general';
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'safety_alert': return '🚨 Urgent Alert';
      case 'person_found': return '🟢 Located / Safe';
      case 'community_update': return '📢 Community Update';
      default: return 'ℹ️ General Notice';
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass announcement-modal-content">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="flex-header-title">
            <Megaphone size={22} className="text-indigo" />
            <div>
              <h2>Push Announcement Center</h2>
              <span className="modal-subtitle">
                Broadcast real-time push notifications directly to every user's mobile device
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} disabled={isSending}>&times;</button>
        </div>

        {/* Tab Selector */}
        <div className="announcement-tabs-bar">
          <button
            type="button"
            className={`ann-tab-btn ${activeTab === 'compose' ? 'active' : ''}`}
            onClick={() => setActiveTab('compose')}
          >
            <Send size={15} />
            <span>Compose Push Announcement</span>
          </button>
          <button
            type="button"
            className={`ann-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={15} />
            <span>Broadcast History ({historyItems.length})</span>
          </button>
        </div>

        <div className="modal-body">
          {errorMsg && (
            <div className="alert alert-danger mb-4">
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'compose' ? (
            <form onSubmit={handleSubmit} className="announcement-form">
              {/* Presets Toolbar */}
              <div className="preset-toolbar-box">
                <span className="preset-title">
                  <Sparkles size={14} className="text-indigo" /> Quick Fill Presets:
                </span>
                <div className="preset-chips">
                  <button
                    type="button"
                    className="preset-chip chip-alert"
                    onClick={() => applyPreset('urgent_search')}
                  >
                    🚨 Urgent Ground Search
                  </button>
                  <button
                    type="button"
                    className="preset-chip chip-found"
                    onClick={() => applyPreset('person_found')}
                  >
                    🟢 Person Located Safe
                  </button>
                  <button
                    type="button"
                    className="preset-chip chip-community"
                    onClick={() => applyPreset('community_meeting')}
                  >
                    📢 Community Briefing
                  </button>
                  <button
                    type="button"
                    className="preset-chip chip-weather"
                    onClick={() => applyPreset('weather_alert')}
                  >
                    ⚠️ Weather Advisory
                  </button>
                </div>
              </div>

              {/* Grid: Form fields on left, live mobile preview on right */}
              <div className="announcement-grid">
                <div className="form-column">
                  {/* Category Selector */}
                  <div className="form-group mb-3">
                    <label className="form-label-styled">Notification Category</label>
                    <div className="category-select-grid">
                      <button
                        type="button"
                        className={`cat-btn ${category === 'safety_alert' ? 'active cat-alert' : ''}`}
                        onClick={() => setCategory('safety_alert')}
                      >
                        <ShieldAlert size={16} />
                        <span>Urgent Alert</span>
                      </button>

                      <button
                        type="button"
                        className={`cat-btn ${category === 'community_update' ? 'active cat-community' : ''}`}
                        onClick={() => setCategory('community_update')}
                      >
                        <Megaphone size={16} />
                        <span>Community</span>
                      </button>

                      <button
                        type="button"
                        className={`cat-btn ${category === 'person_found' ? 'active cat-found' : ''}`}
                        onClick={() => setCategory('person_found')}
                      >
                        <CheckCircle2 size={16} />
                        <span>Person Located</span>
                      </button>

                      <button
                        type="button"
                        className={`cat-btn ${category === 'general' ? 'active cat-general' : ''}`}
                        onClick={() => setCategory('general')}
                      >
                        <Info size={16} />
                        <span>General Notice</span>
                      </button>
                    </div>
                  </div>

                  {/* Notification Title */}
                  <div className="form-group mb-3">
                    <div className="label-with-count">
                      <label className="form-label-styled">Notification Title</label>
                      <span className="char-count">{title.length}/80</span>
                    </div>
                    <input
                      type="text"
                      maxLength={80}
                      placeholder="e.g. 🚨 Urgent Search Volunteer Callout - Soweto"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  {/* Message Body */}
                  <div className="form-group mb-3">
                    <div className="label-with-count">
                      <label className="form-label-styled">Announcement Message</label>
                      <span className="char-count">{message.length}/300</span>
                    </div>
                    <textarea
                      rows={4}
                      maxLength={300}
                      className="form-textarea-styled"
                      placeholder="Type the message that will pop up on every user's mobile screen..."
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      required
                    />
                  </div>

                  {/* Optional Linked Case */}
                  <div className="form-group mb-3">
                    <label className="form-label-styled">
                      <UserCheck size={14} className="label-icon" /> Optional Linked Case (Tapping opens report)
                    </label>
                    <select
                      className="status-select"
                      value={selectedCaseId}
                      onChange={e => setSelectedCaseId(e.target.value)}
                    >
                      <option value="">None (General Broadcast Announcement)</option>
                      {reports.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({getCaseId(c)}) &bull; {c.location}, {c.country}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Audience */}
                  <div className="form-group mb-3">
                    <label className="form-label-styled">
                      <Bell size={14} className="label-icon" /> Target Delivery Topic
                    </label>
                    <select
                      className="status-select"
                      value={targetTopic}
                      onChange={e => setTargetTopic(e.target.value)}
                    >
                      <option value="global-missing-person-alerts">
                        🌐 Global Network — Every Registered Phone (Southern Africa)
                      </option>
                    </select>
                  </div>

                  {/* Sender / Authority Signature */}
                  <div className="form-group mb-3">
                    <label className="form-label-styled">
                      Broadcasting Authority / Sender
                    </label>
                    <input
                      type="text"
                      maxLength={50}
                      placeholder="e.g. Thuso Command Center, SAPS Search & Rescue"
                      value={senderName}
                      onChange={e => setSenderName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Right Column: Live Mobile Push Notification Preview */}
                <div className="preview-column">
                  <div className="preview-header-label">
                    <Smartphone size={16} /> Live Phone Push Preview
                  </div>

                  <div className="phone-mockup-frame">
                    <div className="phone-screen-ambient">
                      <div className="lockscreen-time">12:30</div>
                      <div className="lockscreen-date">Friday, October 16</div>

                      {/* Mockup Notification Banner */}
                      <div className="phone-push-card">
                        <div className="push-card-header">
                          <div className="push-app-brand">
                            <div className="app-icon-mini">
                              <Shield size={12} className="text-white" />
                            </div>
                            <span className="app-name">{(senderName || 'Thuso Alert').toUpperCase()}</span>
                          </div>
                          <span className="push-time">now</span>
                        </div>

                        <div className="push-card-content">
                          <div className="push-title-row">
                            <span className={`push-cat-pill ${getCategoryBadgeClass(category)}`}>
                              {getCategoryLabel(category)}
                            </span>
                            <h4 className="push-title">
                              {title.trim() || 'Announcement Title'}
                            </h4>
                          </div>

                          <p className="push-body">
                            {message.trim() || 'Your announcement message will display here on every user device.'}
                          </p>

                          {selectedCaseId && (
                            <div className="push-attached-tag">
                              📎 Linked Case: {reports.find(r => r.id === selectedCaseId)?.name || selectedCaseId}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="preview-note">
                    <span>⚡ Delivered via Firebase Cloud Messaging with high priority alert sound and vibration.</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="modal-footer mt-4">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                  disabled={isSending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary btn-broadcast"
                  disabled={isSending || !title.trim() || !message.trim()}
                >
                  <Send size={16} />
                  {isSending ? 'Broadcasting Push Notification...' : '🚀 Broadcast to Every User\'s Phone'}
                </button>
              </div>
            </form>
          ) : (
            /* Broadcast History View */
            <div className="broadcast-history-view">
              {historyItems.length > 0 ? (
                <div className="history-list">
                  {historyItems.map((item) => (
                    <div key={item.id} className="history-item-card glass">
                      <div className="history-item-top">
                        <div className="history-title-group">
                          <span className={`badge ${getCategoryBadgeClass(item.category)}`}>
                            {getCategoryLabel(item.category)}
                          </span>
                          <h4 className="history-item-title">{item.title}</h4>
                        </div>
                        <span className="history-time">
                          {new Date(item.sentAt).toLocaleString()}
                        </span>
                      </div>

                      <p className="history-message">{item.message}</p>

                      <div className="history-meta-footer">
                        <span>Audience: <strong>{item.targetTopic}</strong></span>
                        <span>Sender: <strong>{item.senderName}</strong></span>
                        <span className="badge badge-green">
                          <CheckCircle2 size={12} /> {item.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Megaphone size={48} />
                  <p>No announcements broadcasted yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
