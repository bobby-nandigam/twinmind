import { useRef, useCallback } from 'react';
import { transcribeAudio } from '../services/groq';

/**
 * useAudioRecorder — manages MediaRecorder lifecycle and 30-second audio chunking.
 * On each chunk completion, calls onChunkReady with the transcribed text.
 */
export function useAudioRecorder({ apiKey, onChunkTranscribed, onError }) {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunkIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);

  const flushChunk = useCallback(async () => {
    if (!mediaRecorderRef.current || audioChunksRef.current.length === 0) return;

    // Pause collection, grab what we have
    const recorder = mediaRecorderRef.current;
    const chunks = [...audioChunksRef.current];
    audioChunksRef.current = [];

    if (chunks.length === 0) return;

    const mimeType = recorder.mimeType || 'audio/webm';
    const blob = new Blob(chunks, { type: mimeType });

    if (blob.size < 1000) return; // Skip near-empty blobs (silence)

    try {
      const text = await transcribeAudio(blob, apiKey);
      if (text && text.length > 1) {
        onChunkTranscribed(text);
      }
    } catch (err) {
      onError?.(err.message);
    }
  }, [apiKey, onChunkTranscribed, onError]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick best supported MIME type
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find((t) => MediaRecorder.isTypeSupported(t)) || '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(1000); // collect data every 1s for timesliced chunks

      // Flush + transcribe every 30 seconds
      chunkIntervalRef.current = setInterval(flushChunk, 30000);
    } catch (err) {
      onError?.(`Mic access denied: ${err.message}`);
      throw err;
    }
  }, [flushChunk, onError]);

  const stop = useCallback(async () => {
    clearInterval(chunkIntervalRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Flush final chunk
    await flushChunk();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, [flushChunk]);

  /**
   * Force-flush the current audio buffer (used by manual refresh button).
   */
  const forceFlush = useCallback(async () => {
    await flushChunk();
  }, [flushChunk]);

  return { start, stop, forceFlush };
}
