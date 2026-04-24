import { create } from 'zustand';
import { DEFAULT_SETTINGS } from '../utils/defaults';

export const useStore = create((set, get) => ({
  // API Key
  apiKey: '',
  setApiKey: (key) => set({ apiKey: key }),

  // Settings
  settings: DEFAULT_SETTINGS,
  updateSettings: (patch) =>
    set((s) => ({ settings: { ...s.settings, ...patch } })),

  // Transcript
  transcriptChunks: [], // [{ id, text, timestamp }]
  addTranscriptChunk: (text) => {
    const chunk = { id: Date.now(), text, timestamp: new Date().toISOString() };
    set((s) => ({ transcriptChunks: [...s.transcriptChunks, chunk] }));
  },
  clearTranscript: () => set({ transcriptChunks: [] }),

  // Recording state
  isRecording: false,
  setIsRecording: (v) => set({ isRecording: v }),

  // Suggestion batches
  suggestionBatches: [], // [{ id, timestamp, items: [{ id, title, preview, tags }] }]
  addSuggestionBatch: (items) => {
    const batch = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      items: items.map((item, i) => ({ ...item, id: `${Date.now()}-${i}` })),
    };
    set((s) => ({ suggestionBatches: [batch, ...s.suggestionBatches] }));
  },

  // Chat messages
  chatMessages: [], // [{ id, role, content, timestamp, suggestionRef? }]
  addChatMessage: (msg) => {
    const message = { id: Date.now(), timestamp: new Date().toISOString(), ...msg };
    set((s) => ({ chatMessages: [...s.chatMessages, message] }));
    return message.id;
  },
  updateChatMessage: (id, patch) =>
    set((s) => ({
      chatMessages: s.chatMessages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),

  // UI state
  isSuggestionsLoading: false,
  setIsSuggestionsLoading: (v) => set({ isSuggestionsLoading: v }),
  isChatLoading: false,
  setIsChatLoading: (v) => set({ isChatLoading: v }),
  activePanelMobile: 'transcript', // 'transcript' | 'suggestions' | 'chat'
  setActivePanelMobile: (v) => set({ activePanelMobile: v }),

  // Settings panel
  showSettings: false,
  setShowSettings: (v) => set({ showSettings: v }),

  // Export helper
  exportSession: () => {
    const s = get();
    return {
      exportedAt: new Date().toISOString(),
      transcript: s.transcriptChunks,
      suggestionBatches: s.suggestionBatches,
      chatHistory: s.chatMessages,
    };
  },

  // Reset session
  resetSession: () =>
    set({
      transcriptChunks: [],
      suggestionBatches: [],
      chatMessages: [],
      isRecording: false,
      isSuggestionsLoading: false,
      isChatLoading: false,
    }),
}));
