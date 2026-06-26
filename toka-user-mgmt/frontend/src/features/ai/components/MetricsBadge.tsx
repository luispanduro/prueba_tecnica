interface MetricsBadgeProps {
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUSD: number;
}

const badge = {
  display: 'inline-block',
  padding: '0.2rem 0.5rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: 600,
  background: '#f3f4f6',
  color: '#374151',
  marginRight: '0.4rem',
};

export default function MetricsBadge({ latencyMs, inputTokens, outputTokens, estimatedCostUSD }: MetricsBadgeProps) {
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <span style={badge}>⏱ {latencyMs}ms</span>
      <span style={badge}>🔤 {inputTokens + outputTokens} tokens</span>
      <span style={badge}>💲{estimatedCostUSD.toFixed(6)}</span>
    </div>
  );
}
