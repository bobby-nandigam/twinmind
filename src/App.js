import React, { useCallback, useEffect } from 'react';
import { useStore } from './store/useStore';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useSuggestions } from './hooks/useSuggestions';
import { useChat } from './hooks/useChat';
import { TranscriptPanel } from './components/TranscriptPanel';
import { SuggestionsPanel } from './components/SuggestionsPanel';
import { ChatPanel } from './components/ChatPanel';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer, toast } from './components/Toast';
import { exportSession } from './utils/helpers';
import './styles.css';

export default function App() {
  const apiKey = useStore((s) => s.apiKey);
  const isRecording = useStore((s) => s.isRecording);
  const setIsRecording = useStore((s) => s.setIsRecording);
  const addTranscriptChunk = useStore((s) => s.addTranscriptChunk);
  const showSettings = useStore((s) => s.showSettings);
  const setShowSettings = useStore((s) => s.setShowSettings);
  const exportData = useStore((s) => s.exportSession);
  const resetSession = useStore((s) => s.resetSession);
  const activePanelMobile = useStore((s) => s.activePanelMobile);
  const setActivePanelMobile = useStore((s) => s.setActivePanelMobile);

  const onError = useCallback((msg) => toast(msg, 'error'), []);

  const onChunkTranscribed = useCallback(
    (text) => {
      addTranscriptChunk(text);
    },
    [addTranscriptChunk]
  );

  const { start, stop, forceFlush } = useAudioRecorder({
    apiKey,
    onChunkTranscribed,
    onError,
  });

  const { refresh, startAutoRefresh, stopAutoRefresh, notifyRecordingStarted, buildChatContext, buildTranscriptContext } =
    useSuggestions({ onError });

  const { sendMessage, clickSuggestion } = useChat({
    buildChatContext,
    buildTranscriptContext,
    onError,
  });

  // ── Mic Toggle ─────────────────────────────────────────────────────────────
  const handleMicToggle = useCallback(async () => {
    if (!apiKey) {
      toast('Add your Groq API key in Settings first.', 'error');
      setShowSettings(true);
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      stopAutoRefresh();
      await stop();
      startAutoRefresh();
      toast('Recording stopped.', 'info');
    } else {
      try {
        notifyRecordingStarted();
        await start();
        setIsRecording(true);
        toast('Recording started.', 'info');
      } catch {
        // error already toasted inside start()
      }
    }
  }, [apiKey, isRecording, start, stop, startAutoRefresh, stopAutoRefresh, notifyRecordingStarted, setIsRecording, setShowSettings]);

  // ── Manual Refresh ──────────────────────────────────────────────────────────
  const handleManualRefresh = useCallback(async () => {
    if (isRecording) {
      await forceFlush(); // flush audio → transcript first
    }
    await refresh();
  }, [isRecording, forceFlush, refresh]);

  // ── Suggestion Click ────────────────────────────────────────────────────────
  const handleSuggestionClick = useCallback(
    (suggestion) => {
      setActivePanelMobile('chat');
      clickSuggestion(suggestion);
    },
    [clickSuggestion, setActivePanelMobile]
  );

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const data = exportData();
    exportSession(data);
    toast('Session exported!', 'info');
  }, [exportData]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopAutoRefresh();
    };
  }, [stopAutoRefresh]);

  // ── Show settings if no key ─────────────────────────────────────────────────
  useEffect(() => {
    if (!apiKey) {
      setShowSettings(true);
    }
  }, []); // eslint-disable-line

  return (
    <div className="app">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-dot" />
          <span className="brand-name">TwinMind</span>
          <span className="brand-sub">Copilot</span>
        </div>

        <nav className="mobile-nav">
          {['transcript', 'suggestions', 'chat'].map((panel) => (
            <button
              key={panel}
              className={`mobile-nav-btn ${activePanelMobile === panel ? 'mobile-nav-btn--active' : ''}`}
              onClick={() => setActivePanelMobile(panel)}
            >
              {panel === 'transcript' ? '◉' : panel === 'suggestions' ? '⚡' : '💬'}
              <span>{panel.charAt(0).toUpperCase() + panel.slice(1)}</span>
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          <button className="topbar-btn" onClick={handleExport} title="Export session">
            <ExportIcon />
            <span>Export</span>
          </button>
          <button className="topbar-btn" onClick={() => { if (window.confirm('Reset this session?')) resetSession(); }} title="Reset session">
            <ResetIcon />
            <span>Reset</span>
          </button>
          <button
            className={`topbar-btn topbar-btn--settings ${!apiKey ? 'topbar-btn--alert' : ''}`}
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <SettingsIcon />
            <span>{!apiKey ? 'Set API Key' : 'Settings'}</span>
          </button>
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────────────────── */}
      <main className="main-layout">
        <div className={`panel-wrapper ${activePanelMobile === 'transcript' ? 'panel-wrapper--active' : ''}`}>
          <TranscriptPanel onMicToggle={handleMicToggle} isRecording={isRecording} />
        </div>
        <div className={`panel-wrapper ${activePanelMobile === 'suggestions' ? 'panel-wrapper--active' : ''}`}>
          <SuggestionsPanel onRefresh={handleManualRefresh} onSuggestionClick={handleSuggestionClick} />
        </div>
        <div className={`panel-wrapper ${activePanelMobile === 'chat' ? 'panel-wrapper--active' : ''}`}>
          <ChatPanel onSendMessage={sendMessage} />
        </div>
      </main>

      {/* ── Modals & Toasts ──────────────────────────────────────────── */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      <ToastContainer />
    </div>
  );
}

// ── Icons ───────────────────────────────────────────────────────────────────

function ExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-3.59" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
