/**
 * Export the full session as a JSON file download.
 */
export function exportSession(sessionData) {
  const json = JSON.stringify(sessionData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `twinmind-session-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Format a timestamp string into a readable time label.
 */
export function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Get badge color class by suggestion type.
 */
export function getTypeColor(type) {
  const map = {
    question: '#6366f1',   // indigo
    point: '#0ea5e9',      // sky
    answer: '#10b981',     // emerald
    factcheck: '#f59e0b',  // amber
    clarify: '#8b5cf6',    // violet
  };
  return map[type] || '#6b7280';
}

export function getTypeLabel(type) {
  const map = {
    question: 'Ask',
    point: 'Point',
    answer: 'Answer',
    factcheck: 'Fact',
    clarify: 'Clarify',
  };
  return map[type] || type;
}
