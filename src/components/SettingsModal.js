import React, { useState } from 'react';
import { useStore } from '../store/useStore';

export function SettingsModal({ onClose }) {
  const apiKey = useStore((s) => s.apiKey);
  const setApiKey = useStore((s) => s.setApiKey);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const [localKey, setLocalKey] = useState(apiKey);
  const [localSettings, setLocalSettings] = useState({ ...settings });

  const handleSave = () => {
    setApiKey(localKey.trim());
    updateSettings(localSettings);
    onClose();
  };

  const updateLocal = (key, value) =>
    setLocalSettings((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* API Key */}
          <section className="settings-section">
            <h3>Groq API Key</h3>
            <p className="settings-desc">Get yours at <a href="https://console.groq.com" target="_blank" rel="noreferrer">console.groq.com</a></p>
            <input
              type="password"
              className="settings-input"
              placeholder="gsk_..."
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
            />
          </section>

          {/* Models */}
          <section className="settings-section">
            <h3>Models</h3>
            <label className="settings-label">Completion Model</label>
            <input
              className="settings-input"
              value={localSettings.completionModel}
              onChange={(e) => updateLocal('completionModel', e.target.value)}
            />
            <label className="settings-label">Transcription Model</label>
            <input
              className="settings-input"
              value={localSettings.transcriptionModel}
              onChange={(e) => updateLocal('transcriptionModel', e.target.value)}
            />
          </section>

          {/* Context Windows */}
          <section className="settings-section">
            <h3>Context Windows</h3>
            <label className="settings-label">Suggestion Context (chars): {localSettings.suggestionContextChars.toLocaleString()}</label>
            <input
              type="range"
              min={500}
              max={8000}
              step={500}
              value={localSettings.suggestionContextChars}
              onChange={(e) => updateLocal('suggestionContextChars', Number(e.target.value))}
              className="settings-range"
            />
            <label className="settings-label">Chat Context (chars): {localSettings.chatContextChars.toLocaleString()}</label>
            <input
              type="range"
              min={1000}
              max={20000}
              step={1000}
              value={localSettings.chatContextChars}
              onChange={(e) => updateLocal('chatContextChars', Number(e.target.value))}
              className="settings-range"
            />
          </section>

          {/* Auto-refresh interval */}
          <section className="settings-section">
            <h3>Auto-Refresh</h3>
            <label className="settings-label">Interval: {localSettings.autoRefreshInterval / 1000}s</label>
            <input
              type="range"
              min={15000}
              max={120000}
              step={5000}
              value={localSettings.autoRefreshInterval}
              onChange={(e) => updateLocal('autoRefreshInterval', Number(e.target.value))}
              className="settings-range"
            />
          </section>

          {/* Prompts */}
          <section className="settings-section">
            <h3>Suggestion System Prompt</h3>
            <textarea
              className="settings-textarea"
              rows={8}
              value={localSettings.suggestionSystemPrompt}
              onChange={(e) => updateLocal('suggestionSystemPrompt', e.target.value)}
            />
          </section>

          <section className="settings-section">
            <h3>Chat System Prompt</h3>
            <textarea
              className="settings-textarea"
              rows={6}
              value={localSettings.chatSystemPrompt}
              onChange={(e) => updateLocal('chatSystemPrompt', e.target.value)}
            />
          </section>

          <section className="settings-section">
            <h3>Click-to-Expand Detail Prompt</h3>
            <p className="settings-desc">Use {'{type}'}, {'{title}'}, {'{preview}'}, {'{transcript}'} as placeholders.</p>
            <textarea
              className="settings-textarea"
              rows={8}
              value={localSettings.clickDetailPrompt}
              onChange={(e) => updateLocal('clickDetailPrompt', e.target.value)}
            />
          </section>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}
