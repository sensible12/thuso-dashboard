import React, { useState } from 'react';
import { backendService } from '../services/BackendService';
import type { ConnectionConfig } from '../services/BackendService';
import { Save, RefreshCw, Server, Eye, EyeOff } from 'lucide-react';

interface SettingsPanelProps {
  onClose: () => void;
  onConfigChanged: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, onConfigChanged }) => {
  const [config, setConfig] = useState<ConnectionConfig>({ ...backendService.getConfig() });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const toggleShowKey = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    backendService.saveConfig(config);
    onConfigChanged();
    onClose();
  };

  const resetToDefault = () => {
    if (window.confirm('Reset connection parameters to defaults?')) {
      localStorage.removeItem('thuso_config');
      window.location.reload();
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal glass">
        <div className="modal-header">
          <h2>Connection & Backend Configurations</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSave} className="settings-form">
          {/* Mode Switcher */}
          <div className="settings-section mode-selection">
            <h3>Operation Mode</h3>
            <div className="mode-toggle-group">
              <label className={`mode-label ${config.mode === 'mock' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="mode" 
                  value="mock" 
                  checked={config.mode === 'mock'} 
                  onChange={() => setConfig(prev => ({ ...prev, mode: 'mock' }))} 
                />
                <span className="mode-title">Mock Mode (Offline)</span>
                <span className="mode-desc">Use built-in high-fidelity database mock simulation</span>
              </label>

              <label className={`mode-label ${config.mode === 'live' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="mode" 
                  value="live" 
                  checked={config.mode === 'live'} 
                  onChange={() => setConfig(prev => ({ ...prev, mode: 'live' }))} 
                />
                <span className="mode-title">Live Mode (Production)</span>
                <span className="mode-desc">Fetch and moderate data in real-time from Firestore, Supabase & Appwrite</span>
              </label>
            </div>
          </div>

          {config.mode === 'live' && (
            <div className="live-configs-scroll">
              {/* Firebase Settings */}
              <div className="settings-section">
                <div className="section-title">
                  <Server size={18} className="icon-orange" />
                  <h3>Firebase Firestore Config (South Africa)</h3>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Project ID</label>
                    <input 
                      type="text" 
                      value={config.firebase.projectId} 
                      onChange={e => setConfig(prev => ({ ...prev, firebase: { ...prev.firebase, projectId: e.target.value } }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Collection Name</label>
                    <input 
                      type="text" 
                      value={config.firebase.collectionName} 
                      onChange={e => setConfig(prev => ({ ...prev, firebase: { ...prev.firebase, collectionName: e.target.value } }))} 
                    />
                  </div>
                  <div className="form-group span-2 relative-input">
                    <label>API Key</label>
                    <div className="input-with-eye">
                      <input 
                        type={showKeys['fb_api'] ? 'text' : 'password'} 
                        value={config.firebase.apiKey} 
                        onChange={e => setConfig(prev => ({ ...prev, firebase: { ...prev.firebase, apiKey: e.target.value } }))} 
                      />
                      <button type="button" onClick={() => toggleShowKey('fb_api')}>
                        {showKeys['fb_api'] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Auth Domain</label>
                    <input 
                      type="text" 
                      value={config.firebase.authDomain} 
                      onChange={e => setConfig(prev => ({ ...prev, firebase: { ...prev.firebase, authDomain: e.target.value } }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label>App ID</label>
                    <input 
                      type="text" 
                      value={config.firebase.appId} 
                      onChange={e => setConfig(prev => ({ ...prev, firebase: { ...prev.firebase, appId: e.target.value } }))} 
                    />
                  </div>
                </div>
              </div>

              {/* Supabase Settings */}
              <div className="settings-section">
                <div className="section-title">
                  <Server size={18} className="icon-green" />
                  <h3>Supabase Config (Botswana & Namibia)</h3>
                </div>
                <div className="form-grid">
                  <div className="form-group span-2">
                    <label>Supabase URL</label>
                    <input 
                      type="text" 
                      value={config.supabase.url} 
                      onChange={e => setConfig(prev => ({ ...prev, supabase: { ...prev.supabase, url: e.target.value } }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Table Name</label>
                    <input 
                      type="text" 
                      value={config.supabase.tableName} 
                      onChange={e => setConfig(prev => ({ ...prev, supabase: { ...prev.supabase, tableName: e.target.value } }))} 
                    />
                  </div>
                  <div className="form-group span-2 relative-input">
                    <label>Anon Key (Publishable)</label>
                    <div className="input-with-eye">
                      <input 
                        type={showKeys['sb_key'] ? 'text' : 'password'} 
                        value={config.supabase.anonKey} 
                        onChange={e => setConfig(prev => ({ ...prev, supabase: { ...prev.supabase, anonKey: e.target.value } }))} 
                      />
                      <button type="button" onClick={() => toggleShowKey('sb_key')}>
                        {showKeys['sb_key'] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Appwrite Settings */}
              <div className="settings-section">
                <div className="section-title">
                  <Server size={18} className="icon-red" />
                  <h3>Appwrite Config (Lesotho & Eswatini)</h3>
                </div>
                <div className="form-grid">
                  <div className="form-group span-2">
                    <label>Endpoint URL</label>
                    <input 
                      type="text" 
                      value={config.appwrite.endpoint} 
                      onChange={e => setConfig(prev => ({ ...prev, appwrite: { ...prev.appwrite, endpoint: e.target.value } }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Project ID</label>
                    <input 
                      type="text" 
                      value={config.appwrite.projectId} 
                      onChange={e => setConfig(prev => ({ ...prev, appwrite: { ...prev.appwrite, projectId: e.target.value } }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Database ID</label>
                    <input 
                      type="text" 
                      value={config.appwrite.databaseId} 
                      onChange={e => setConfig(prev => ({ ...prev, appwrite: { ...prev.appwrite, databaseId: e.target.value } }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Collection ID</label>
                    <input 
                      type="text" 
                      value={config.appwrite.collectionId} 
                      onChange={e => setConfig(prev => ({ ...prev, appwrite: { ...prev.appwrite, collectionId: e.target.value } }))} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="settings-actions">
            <button type="button" className="btn-secondary" onClick={resetToDefault}>
              <RefreshCw size={16} />
              Reset Defaults
            </button>
            <div className="action-right">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary">
                <Save size={16} />
                Save Settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
