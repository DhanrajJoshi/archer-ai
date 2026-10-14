import { useEffect, useRef, useState } from 'react';
import {
  AgentInfo,
  ChatResponse,
  fetchAgents,
  fetchHealth,
  sendMessage,
} from './api.js';

interface ChatMessage {
  role: 'user' | 'assistant' | 'error';
  content: string;
  agentName?: string;
  toolUses?: ChatResponse['toolUses'];
  executionTime?: number;
}

export default function App() {
  const [agentsLoaded, setAgentsLoaded] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [agentsAvailable, setAgentsAvailable] = useState<boolean | null>(null);
  const [healthError, setHealthError] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHealth()
      .then((health) => setAgentsAvailable(health.agentsAvailable))
      .catch((err) => setHealthError(err.message));
    fetchAgents()
      .then((list) => {
        setAgents(list);
        setAgentsLoaded(true);
        if (list.length > 0) setSelectedAgent('ARCHER');
      })
      .catch(() => setAgentsLoaded(true));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function handleSend() {
    const message = input.trim();
    if (message === '' || sending) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setSending(true);

    try {
      const response = await sendMessage(message, selectedAgent || null);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.content,
          agentName: response.agentName,
          toolUses: response.toolUses,
          executionTime: response.executionTime,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'error',
          content: err instanceof Error ? err.message : String(err),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>ARCHER AI</h1>
        <div className="agent-picker">
          {agents.length > 0 ? (
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} — {agent.role}
                </option>
              ))}
            </select>
          ) : (
            <span className="muted">
              {healthError
                ? 'Backend unreachable'
                : agentsLoaded && agents.length === 0
                  ? 'No agents — backend needs GEMINI_API_KEY'
                  : 'Loading agents…'}
            </span>
          )}
        </div>
      </header>

      {agentsAvailable === false && (
        <div className="banner banner-warn">
          GEMINI_API_KEY is not configured on the backend. Agent features are
          unavailable until it is set.
        </div>
      )}
      {healthError && (
        <div className="banner banner-error">
          Cannot reach the backend: {healthError}
        </div>
      )}

      <main className="chat">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>Start a conversation with ARCHER.</p>
            <p className="muted">
              Pick a specialist agent above, or use ARCHER to coordinate.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`message message-${msg.role}`}>
            <div className="message-meta">
              {msg.role === 'assistant'
                ? msg.agentName
                : msg.role === 'user'
                  ? 'You'
                  : 'Error'}
              {msg.executionTime != null && (
                <span className="muted"> · {msg.executionTime}ms</span>
              )}
            </div>
            <div className="message-body">{msg.content}</div>
            {msg.toolUses && msg.toolUses.length > 0 && (
              <details className="tool-uses">
                <summary>{msg.toolUses.length} tool call(s)</summary>
                <pre>{JSON.stringify(msg.toolUses, null, 2)}</pre>
              </details>
            )}
          </div>
        ))}
        {sending && <div className="message message-assistant muted">Thinking…</div>}
        <div ref={messagesEndRef} />
      </main>

      <footer className="composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for a new line)"
          rows={2}
          disabled={agentsAvailable === false}
        />
        <button
          onClick={handleSend}
          disabled={input.trim() === '' || sending || agentsAvailable === false}
        >
          Send
        </button>
      </footer>
    </div>
  );
}
