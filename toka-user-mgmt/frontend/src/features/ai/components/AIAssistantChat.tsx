import { useState } from 'react';
import { useQueryAIMutation, type AIQueryResult } from '../aiApi';
import { useToast } from '../../../shared/hooks/useToast';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import MetricsBadge from './MetricsBadge';

const MAX_CHARS = 1000;

export default function AIAssistantChat() {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AIQueryResult | null>(null);
  const [queryAI, { isLoading }] = useQueryAIMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const data = await queryAI({ query }).unwrap();
      setResult(data);
    } catch {
      toast.error('Error al consultar el asistente de IA');
    }
  };

  return (
    <div style={{ maxWidth: '760px' }}>
      <h2 style={{ margin: '0 0 1.5rem' }}>Asistente IA</h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ position: 'relative' }}>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Escribe tu pregunta sobre Toka..."
            rows={4}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <span style={{
            position: 'absolute',
            bottom: '0.5rem',
            right: '0.75rem',
            fontSize: '0.75rem',
            color: query.length >= MAX_CHARS ? '#dc2626' : '#9ca3af',
          }}>
            {query.length}/{MAX_CHARS}
          </span>
        </div>
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          style={{
            alignSelf: 'flex-end',
            padding: '0.5rem 1.25rem',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: isLoading || !query.trim() ? 'not-allowed' : 'pointer',
            opacity: isLoading || !query.trim() ? 0.7 : 1,
          }}
        >
          Preguntar
        </button>
      </form>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', color: '#6b7280' }}>
          <LoadingSpinner size="sm" />
          <span>El asistente está pensando...</span>
        </div>
      )}

      {result && !isLoading && (
        <div style={{
          marginTop: '1.5rem',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1.25rem',
          background: '#fff',
        }}>
          <p style={{ margin: '0 0 0.75rem', lineHeight: 1.7, color: '#111827', whiteSpace: 'pre-wrap' }}>{result.answer}</p>

          <MetricsBadge
            latencyMs={result.latencyMs}
            inputTokens={result.inputTokens}
            outputTokens={result.outputTokens}
            estimatedCostUSD={result.estimatedCostUSD}
          />

          {result.qualityFlags.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              {result.qualityFlags.map((flag) => (
                <span key={flag} style={{ display: 'inline-block', background: '#fef3c7', color: '#92400e', borderRadius: '9999px', padding: '0.15rem 0.5rem', fontSize: '0.75rem', marginRight: '0.4rem' }}>
                  ⚠ {flag}
                </span>
              ))}
            </div>
          )}

          {result.sources && result.sources.length > 0 && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#6b7280' }}>Fuentes utilizadas</p>
              <ul style={{ margin: 0, padding: '0 0 0 1rem', fontSize: '0.8rem', color: '#374151' }}>
                {result.sources.map((src, i) => (
                  <li key={i} style={{ marginBottom: '0.2rem' }}>
                    <span style={{ fontFamily: 'monospace' }}>{src.source}</span>
                    <span style={{ color: '#9ca3af', marginLeft: '0.4rem' }}>({(src.score * 100).toFixed(1)}%)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
