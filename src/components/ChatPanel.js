import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { formatTime } from '../utils/helpers';

export function ChatPanel({ onSendMessage }) {
  const chatMessages = useStore((s) => s.chatMessages);
  const isChatLoading = useStore((s) => s.isChatLoading);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isChatLoading) return;
    setInput('');
    onSendMessage(text);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="panel chat-panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-icon">💬</span>
          Chat
        </div>
        <div className="chat-header-sub">{chatMessages.length > 0 ? `${Math.floor(chatMessages.length / 2)} exchanges` : 'Ask anything'}</div>
      </div>

      <div className="panel-body chat-body">
        {chatMessages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🤖</div>
            <p className="empty-title">Ask me anything</p>
            <p className="empty-sub">Click a suggestion or type a question below.</p>
          </div>
        ) : (
          <>
            {chatMessages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Ask a question about the meeting..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={isChatLoading}
        />
        <button
          className={`send-btn ${isChatLoading ? 'send-btn--loading' : ''}`}
          onClick={handleSend}
          disabled={!input.trim() || isChatLoading}
          title="Send (Enter)"
        >
          {isChatLoading ? <LoadingDots /> : <SendIcon />}
        </button>
      </div>
    </div>
  );
}

function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const isStreaming = message.streaming;
  const isError = message.error;

  return (
    <div className={`chat-message chat-message--${isUser ? 'user' : 'assistant'}`}>
      <div className="message-meta">
        <span className="message-role">{isUser ? 'You' : 'Copilot'}</span>
        <span className="message-time">{formatTime(message.timestamp)}</span>
        {isStreaming && <span className="streaming-badge">●</span>}
      </div>
      <div className={`message-content ${isError ? 'message-content--error' : ''}`}>
        <MarkdownContent text={message.content} />
        {isStreaming && !message.content && <LoadingDots />}
      </div>
    </div>
  );
}

/**
 * Minimal markdown renderer — supports bold, bullet lists, headers.
 * Full markdown lib avoids large dependency for this use case.
 */
function MarkdownContent({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length) {
      elements.push(
        <ul key={`list-${elements.length}`} className="md-list">
          {listItems.map((li, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: renderInline(li) }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    if (line.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={i} dangerouslySetInnerHTML={{ __html: renderInline(line.slice(4)) }} />);
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={i} dangerouslySetInnerHTML={{ __html: renderInline(line.slice(3)) }} />);
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(<h2 key={i} dangerouslySetInnerHTML={{ __html: renderInline(line.slice(2)) }} />);
    } else if (line.match(/^[-*] /)) {
      listItems.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
      if (elements.length > 0) {
        elements.push(<br key={`br-${i}`} />);
      }
    } else {
      flushList();
      elements.push(<p key={i} dangerouslySetInnerHTML={{ __html: renderInline(line) }} />);
    }
  });

  flushList();
  return <div className="md-content">{elements}</div>;
}

function renderInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function LoadingDots() {
  return (
    <span className="loading-dots-inline">
      <span /><span /><span />
    </span>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
