import { useState } from 'react';
import { useGetAuditLogsQuery } from '../auditApi';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import ErrorMessage from '../../../shared/components/ErrorMessage';
import AuditFilters, { DEFAULT_FILTERS } from './AuditFilters';
import { formatDate } from '../../../shared/utils/formatters';

type FilterValues = typeof DEFAULT_FILTERS;

const statusBadge = (status: string) => ({
  background: status === 'success' ? '#dcfce7' : '#fee2e2',
  color: status === 'success' ? '#16a34a' : '#dc2626',
  padding: '0.2rem 0.6rem',
  borderRadius: '9999px',
  fontSize: '0.78rem',
  fontWeight: 600,
  textTransform: 'capitalize' as const,
});

export default function AuditLogTable() {
  const [pendingFilters, setPendingFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [activeFilters, setActiveFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useGetAuditLogsQuery({
    page,
    limit: 20,
    ...(activeFilters.startDate && { startDate: activeFilters.startDate }),
    ...(activeFilters.endDate && { endDate: activeFilters.endDate }),
    ...(activeFilters.userId && { userId: activeFilters.userId }),
    ...(activeFilters.eventType && { eventType: activeFilters.eventType }),
    ...(activeFilters.service && { service: activeFilters.service }),
    ...(activeFilters.status && { status: activeFilters.status }),
  });

  const handleApply = () => { setActiveFilters(pendingFilters); setPage(1); };
  const handleReset = () => { setPendingFilters(DEFAULT_FILTERS); setActiveFilters(DEFAULT_FILTERS); setPage(1); };

  return (
    <div>
      <h2 style={{ margin: '0 0 1rem' }}>Auditoría</h2>

      <AuditFilters
        filters={pendingFilters}
        onChange={setPendingFilters}
        onApply={handleApply}
        onReset={handleReset}
      />

      {isLoading && <LoadingSpinner />}
      {isError && (
        <ErrorMessage message={(error as { data?: { message?: string } })?.data?.message ?? 'Error al cargar auditoría'} />
      )}

      {!isLoading && !isError && (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
                {['Timestamp', 'Servicio', 'Tipo', 'Usuario', 'Estado'].map((h) => (
                  <th key={h} style={{ padding: '0.75rem 1rem', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.data.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: '#6b7280' }}>{formatDate(log.timestamp)}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{log.service}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <code style={{ background: '#f3f4f6', padding: '0.1rem 0.35rem', borderRadius: '0.25rem', fontSize: '0.8rem' }}>{log.eventType}</code>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.8rem' }}>{log.userId}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={statusBadge(log.status)}>{log.status}</span>
                  </td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Sin registros</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{data ? `${data.total} registros en total` : ''}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '0.375rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>
                ← Anterior
              </button>
              <span style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}>Página {page}</span>
              <button type="button" onClick={() => setPage((p) => p + 1)} disabled={!data || page * 20 >= data.total}
                style={{ padding: '0.375rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: (!data || page * 20 >= data.total) ? 'not-allowed' : 'pointer', opacity: (!data || page * 20 >= data.total) ? 0.5 : 1 }}>
                Siguiente →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
