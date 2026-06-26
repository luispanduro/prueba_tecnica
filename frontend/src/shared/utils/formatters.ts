export const formatDate = (date: string | Date): string =>
  new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

export const formatCost = (usd: number): string => `$${usd.toFixed(6)}`;

export const formatLatency = (ms: number): string =>
  ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
