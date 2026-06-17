import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAiStore } from '../store/ai.store';
import { ChatMessage } from '../types/ai.types';

const querySchema = z.object({
  query: z.string().min(1, 'Query is required'),
});

type QueryForm = z.infer<typeof querySchema>;

export function AiChatPage() {
  const { messages, isLoading, error, lastMetadata, sendQuery, clearChat, clearError } = useAiStore();

  const form = useForm<QueryForm>({ resolver: zodResolver(querySchema) });

  const handleSend = async (data: QueryForm) => {
    await sendQuery(data.query);
    form.reset();
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={{ margin: 0 }}>AI Assistant</h2>
        <button onClick={clearChat} style={s.clearBtn}>Clear Chat</button>
      </div>

      {error && <div style={s.error}>{error} <button onClick={clearError}>×</button></div>}

      {/* Messages */}
      <div style={s.chatArea}>
        {messages.length === 0 && !isLoading && (
          <p style={s.emptyMsg}>Ask a question about the user management system.</p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div style={s.loadingBubble}>Thinking...</div>
        )}
      </div>

      {/* Metadata */}
      {lastMetadata && (
        <div style={s.metadata}>
          <span>Model: {lastMetadata.model}</span>
          <span>Latency: {lastMetadata.latency_ms}ms</span>
          <span>Context: {lastMetadata.context_count} docs</span>
          <span>Tokens: {lastMetadata.tokens_in}↑ {lastMetadata.tokens_out}↓</span>
          {lastMetadata.cost_estimate != null && <span>Cost: ${lastMetadata.cost_estimate.toFixed(6)}</span>}
        </div>
      )}

      {/* Input */}
      <form onSubmit={form.handleSubmit(handleSend)} style={s.inputArea}>
        <input
          {...form.register('query')}
          placeholder="Type your question..."
          style={s.input}
          disabled={isLoading}
          autoComplete="off"
        />
        <button type="submit" style={s.sendBtn} disabled={isLoading}>
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
      {form.formState.errors.query && (
        <span style={s.fieldErr}>{form.formState.errors.query.message}</span>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div style={{ ...s.bubble, ...(isUser ? s.userBubble : s.assistantBubble) }}>
      <div style={s.bubbleRole}>{isUser ? 'You' : 'AI Assistant'}</div>
      <div style={s.bubbleContent}>{message.content}</div>
      <div style={s.bubbleTime}>{new Date(message.timestamp).toLocaleTimeString()}</div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { padding: '2rem', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  clearBtn: { padding: '0.3rem 0.7rem', background: '#757575', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  chatArea: { flex: 1, overflowY: 'auto', padding: '1rem', background: '#fff', borderRadius: '6px', border: '1px solid #e0e0e0', marginBottom: '0.5rem' },
  emptyMsg: { color: '#888', textAlign: 'center', marginTop: '2rem' },
  loadingBubble: { padding: '0.75rem 1rem', background: '#e3f2fd', borderRadius: '12px', maxWidth: '70%', color: '#1565c0', fontStyle: 'italic' },
  bubble: { padding: '0.75rem 1rem', borderRadius: '12px', maxWidth: '75%', marginBottom: '0.75rem', wordBreak: 'break-word' as const },
  userBubble: { background: '#e3f2fd', marginLeft: 'auto' },
  assistantBubble: { background: '#f5f5f5' },
  bubbleRole: { fontSize: '0.7rem', fontWeight: 600, color: '#666', marginBottom: '0.2rem' },
  bubbleContent: { fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' as const },
  bubbleTime: { fontSize: '0.65rem', color: '#999', marginTop: '0.3rem', textAlign: 'right' as const },
  metadata: { display: 'flex', gap: '1rem', padding: '0.5rem', fontSize: '0.7rem', color: '#666', background: '#fafafa', borderRadius: '4px', marginBottom: '0.5rem', flexWrap: 'wrap' as const },
  inputArea: { display: 'flex', gap: '0.5rem' },
  input: { flex: 1, padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.95rem' },
  sendBtn: { padding: '0.75rem 1.5rem', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 },
  error: { padding: '0.75rem', background: '#fdecea', color: '#d32f2f', borderRadius: '4px', marginBottom: '0.5rem', fontSize: '0.875rem' },
  fieldErr: { fontSize: '0.7rem', color: '#d32f2f' },
};
