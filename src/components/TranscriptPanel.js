import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { formatTime } from '../utils/helpers';

export function TranscriptPanel({ onMicToggle, isRecording }) {
  const transcriptChunks = useStore((s) => s.transcriptChunks);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new chunks
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptChunks]);

  return (
    <div className="panel transcript-panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-icon">◉</span>
          Transcript
        </div>
        <button
          className={`mic-btn ${isRecording ? 'mic-btn--active' : ''}`}
          onClick={onMicToggle}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? (
            <>
              <span className="mic-pulse" />
              <MicIcon />
              <span>Stop</span>
            </>
          ) : (
            <>
              <MicIcon />
              <span>Record</span>
            </>
          )}
        </button>
      </div>

      <div className="panel-body transcript-body">
        {transcriptChunks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎙</div>
            <p className="empty-title">Waiting for audio...</p>
            <p className="empty-sub">Hit record and start speaking. Transcript appears every 30 seconds.</p>
          </div>
        ) : (
          <>
            {transcriptChunks.map((chunk) => (
              <div key={chunk.id} className="transcript-chunk">
                <span className="chunk-time">{formatTime(chunk.timestamp)}</span>
                <p className="chunk-text">{chunk.text}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {isRecording && (
        <div className="recording-indicator">
          <span className="rec-dot" />
          <span className="rec-label">REC</span>
          <span className="rec-sub">Auto-transcribes every 30s</span>
        </div>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-7 8a1 1 0 0 1 1 1 6 6 0 0 0 12 0 1 1 0 1 1 2 0 8 8 0 0 1-7 7.93V22h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2.07A8 8 0 0 1 4 12a1 1 0 0 1 1-1z" />
    </svg>
  );
}
