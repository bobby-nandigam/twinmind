import { useCallback, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { generateSuggestions } from '../services/groq';

export function useSuggestions({ onError }) {
  const apiKey = useStore((s) => s.apiKey);
  const settings = useStore((s) => s.settings);
  const transcriptChunks = useStore((s) => s.transcriptChunks);
  const addSuggestionBatch = useStore((s) => s.addSuggestionBatch);
  const setIsSuggestionsLoading = useStore((s) => s.setIsSuggestionsLoading);
  const isSuggestionsLoading = useStore((s) => s.isSuggestionsLoading);

  const autoRefreshRef = useRef(null);
  const refreshRef = useRef(null);
  const isRecordingRef = useRef(false); // Track recording state internally
  const prevChunkLengthRef = useRef(0);  // Detect new transcript chunks

  const buildTranscriptContext = useCallback(() => {
    const fullText = transcriptChunks.map((c) => c.text).join('\n');
    const maxChars = settings.suggestionContextChars;
    return fullText.length > maxChars ? fullText.slice(-maxChars) : fullText;
  }, [transcriptChunks, settings.suggestionContextChars]);

  const buildChatContext = useCallback(() => {
    const fullText = transcriptChunks.map((c) => c.text).join('\n');
    const maxChars = settings.chatContextChars;
    return fullText.length > maxChars ? fullText.slice(-maxChars) : fullText;
  }, [transcriptChunks, settings.chatContextChars]);

  const refresh = useCallback(async (suppressErrors = false) => {
    if (isSuggestionsLoading) return;

    const context = buildTranscriptContext();
    if (!context.trim()) {
      if (!suppressErrors) onError?.('No transcript yet — start speaking first.');
      return;
    }
    if (!apiKey) {
      if (!suppressErrors) onError?.('No API key set. Open Settings to add your Groq key.');
      return;
    }

    setIsSuggestionsLoading(true);
    try {
      const items = await generateSuggestions(
        context,
        settings.suggestionSystemPrompt,
        apiKey,
        settings.completionModel
      );
      addSuggestionBatch(items);
    } catch (err) {
      if (!suppressErrors) onError?.(`Suggestions failed: ${err.message}`);
    } finally {
      setIsSuggestionsLoading(false);
    }
  }, [isSuggestionsLoading, buildTranscriptContext, apiKey, settings, addSuggestionBatch, setIsSuggestionsLoading, onError]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // ✅ Watch for new transcript chunks arriving AFTER recording stops
  // This fires the instant transcript is ready, then every 30s
  useEffect(() => {
    const currentLength = transcriptChunks.length;

    // Only act if chunks grew and we're NOT currently recording
    if (!isRecordingRef.current && currentLength > prevChunkLengthRef.current) {
      console.log('[useSuggestions] New transcript chunks detected post-recording, triggering refresh');
      refreshRef.current?.(true);
    }

    prevChunkLengthRef.current = currentLength;
  }, [transcriptChunks]);

  const startAutoRefresh = useCallback(() => {
    isRecordingRef.current = false; // Recording stopped — allow transcript-triggered refresh

    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);

    // Refresh immediately if transcript already exists
    refreshRef.current?.(true);

    // Set up 30s interval
    autoRefreshRef.current = setInterval(() => {
      console.log('[useSuggestions] 30s interval tick');
      refreshRef.current?.(true);
    }, 30000);
  }, []);

  // ✅ Call this when recording STARTS — suppresses the transcript watcher
  const notifyRecordingStarted = useCallback(() => {
    console.log('[useSuggestions] Recording started — pausing transcript watcher');
    isRecordingRef.current = true;
    prevChunkLengthRef.current = transcriptChunks.length; // Reset baseline
  }, [transcriptChunks.length]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
    isRecordingRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, []);

  return { refresh, startAutoRefresh, stopAutoRefresh, notifyRecordingStarted, buildChatContext, buildTranscriptContext };
}