import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import { chatCompletionStream, expandSuggestion } from '../services/groq';

/**
 * useChat — manages chat message lifecycle, streaming, and suggestion expansion.
 */
export function useChat({ buildChatContext, buildTranscriptContext, onError }) {
  const apiKey = useStore((s) => s.apiKey);
  const settings = useStore((s) => s.settings);
  const chatMessages = useStore((s) => s.chatMessages);
  const addChatMessage = useStore((s) => s.addChatMessage);
  const updateChatMessage = useStore((s) => s.updateChatMessage);
  const setIsChatLoading = useStore((s) => s.setIsChatLoading);

  /**
   * Send a free-text user message, stream back the assistant reply.
   */
  const sendMessage = useCallback(async (userText) => {
    if (!apiKey) {
      onError?.('No API key set.');
      return;
    }

    // Add user message
    addChatMessage({ role: 'user', content: userText });

    // Add empty assistant placeholder
    const assistantId = addChatMessage({ role: 'assistant', content: '', streaming: true });

    setIsChatLoading(true);
    try {
      const transcriptContext = buildChatContext();

      // Build conversation history for the API (exclude the empty placeholder)
      const history = chatMessages
        .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))
        .map((m) => ({ role: m.role, content: m.content }));

      // Append transcript as context in the last user message
      const contextualHistory = [
        ...history,
        {
          role: 'user',
          content: transcriptContext
            ? `Meeting transcript so far:\n${transcriptContext}\n\nMy question: ${userText}`
            : userText,
        },
      ];

      let accumulated = '';
      await chatCompletionStream({
        apiKey,
        model: settings.completionModel,
        systemPrompt: settings.chatSystemPrompt,
        messages: contextualHistory,
        onToken: (token) => {
          accumulated += token;
          updateChatMessage(assistantId, { content: accumulated });
        },
        maxTokens: 1200,
      });

      updateChatMessage(assistantId, { streaming: false });
    } catch (err) {
      updateChatMessage(assistantId, {
        content: `⚠️ Error: ${err.message}`,
        streaming: false,
        error: true,
      });
      onError?.(err.message);
    } finally {
      setIsChatLoading(false);
    }
  }, [apiKey, settings, chatMessages, addChatMessage, updateChatMessage, setIsChatLoading, buildChatContext, onError]);

  /**
   * Click a suggestion card — expand it as a chat message with streaming.
   */
  const clickSuggestion = useCallback(async (suggestion) => {
    if (!apiKey) {
      onError?.('No API key set.');
      return;
    }

    // Add user-side message showing what was clicked
    addChatMessage({
      role: 'user',
      content: `📌 ${suggestion.title}`,
      suggestionRef: suggestion,
    });

    // Placeholder assistant message
    const assistantId = addChatMessage({ role: 'assistant', content: '', streaming: true });

    setIsChatLoading(true);
    try {
      const transcriptContext = buildTranscriptContext();
      let accumulated = '';

      await expandSuggestion(
        suggestion,
        transcriptContext,
        settings.clickDetailPrompt,
        settings.chatSystemPrompt,
        apiKey,
        settings.completionModel,
        (token) => {
          accumulated += token;
          updateChatMessage(assistantId, { content: accumulated });
        }
      );

      updateChatMessage(assistantId, { streaming: false });
    } catch (err) {
      updateChatMessage(assistantId, {
        content: `⚠️ Error: ${err.message}`,
        streaming: false,
        error: true,
      });
      onError?.(err.message);
    } finally {
      setIsChatLoading(false);
    }
  }, [apiKey, settings, addChatMessage, updateChatMessage, setIsChatLoading, buildTranscriptContext, onError]);

  return { sendMessage, clickSuggestion };
}
