import React, { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { expandSuggestion } from '../services/groq';

const TYPE_COLOR = {
  ASK: '#3b82f6',
  POINT: '#10b981',
  CLARIFY: '#f59e0b',
};

function SuggestionCard({ suggestion, onSuggestionClick }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const apiKey = useStore((s) => s.apiKey);
  const settings = useStore((s) => s.settings);
  const transcriptChunks = useStore((s) => s.transcriptChunks);

  const handleClick = useCallback(async () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);

    if (!detail && !loading) {
      setLoading(true);
      try {
        const recentTranscript = transcriptChunks.slice(-6).map((c) => c.text).join('\n');
        const result = await expandSuggestion(
          suggestion,
          recentTranscript,
          settings.clickDetailPrompt,
          apiKey,
          settings.completionModel
        );
        setDetail(result);
      } catch {
        setDetail(suggestion.body || 'Could not load details.');
      } finally {
        setLoading(false);
      }
    }
  }, [expanded, detail, loading, suggestion, transcriptChunks, settings, apiKey]);

  return (
    <div className="suggestion-card" onClick={handleClick}>
      <div className="suggestion-card-header">
        <span
          className="suggestion-type"
          style={{ color: TYPE_COLOR[suggestion.type] || '#94a3b8' }}
        >
          {suggestion.type}
        </span>
        <span className="suggestion-title">{suggestion.title}</span>
      </div>

      <p className="suggestion-preview">{suggestion.preview}</p>

      {expanded ? (
        <div className="suggestion-detail">
          {loading ? (
            <span className="suggestion-detail-loading">Loading details…</span>
          ) : (
            <>
              <p>{detail}</p>
              <button
                className="suggestion-chat-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSuggestionClick(suggestion);
                }}
              >
                Discuss in chat →
              </button>
            </>
          )}
        </div>
      ) : (
        <span className="suggestion-click-hint">Click for details</span>
      )}
    </div>
  );
}

export function SuggestionsPanel({ onRefresh, onSuggestionClick }) {
  const suggestionBatches = useStore((s) => s.suggestionBatches);
  const isSuggestionsLoading = useStore((s) => s.isSuggestionsLoading);

  return (
    <div className="panel suggestions-panel">
      <div className="panel-header">
        <h2>Live Suggestions</h2>
        <button
          className="panel-action-btn"
          onClick={onRefresh}
          disabled={isSuggestionsLoading}
        >
          {isSuggestionsLoading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="panel-body">
        {suggestionBatches.length === 0 && !isSuggestionsLoading && (
          <div className="panel-empty">Start recording to get live suggestions</div>
        )}
        {isSuggestionsLoading && suggestionBatches.length === 0 && (
          <div className="panel-empty">Generating suggestions…</div>
        )}

        {suggestionBatches.map((batch) => (
          <div key={batch.id} className="suggestion-batch">
            <div className="batch-timestamp">
              {new Date(batch.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
              <span className="batch-label">Latest</span>
            </div>
            {batch.items.map((s, i) => (
              <SuggestionCard key={i} suggestion={s} onSuggestionClick={onSuggestionClick} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}