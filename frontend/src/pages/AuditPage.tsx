import { useEffect } from 'react';
import { useAuditStore } from '../store/audit.store';

export function AuditPage() {
  const { events, isLoading, error, fetchEvents, clearError } = useAuditStore();

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Audit Events</h2>

      {error && <div style={s.error}>{error} <button onClick={clearError}>×</button></div>}

      {isLoading ? <p>Loading events...</p> : (
        <>
          {events.length === 0 ? (
            <p style={{ color: '#666' }}>No audit events recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Timestamp</th>
                    <th style={s.th}>Event</th>
                    <th style={s.th}>Action</th>
                    <th style={s.th}>Actor</th>
                    <th style={s.th}>Resource</th>
                    <th style={s.th}>Service</th>
                    <th style={s.th}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} style={s.row}>
                      <td style={s.td}>{new Date(event.timestamp).toLocaleString()}</td>
                      <td style={s.td}><code>{event.event_type}</code></td>
                      <td style={s.td}>{event.action}</td>
                      <td style={s.td}>{event.actor_username || event.actor_id}</td>
                      <td style={s.td}>
                        {event.resource_type}
                        {event.resource_id && <span style={s.resourceId}>{event.resource_id.slice(0, 8)}...</span>}
                      </td>
                      <td style={s.td}>{event.service_origin}</td>
                      <td style={s.td}>
                        {Object.keys(event.details || {}).length > 0 && (
                          <code style={s.details}>{JSON.stringify(event.details)}</code>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#888' }}>
            Showing {events.length} event(s)
          </p>
        </>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '6px', fontSize: '0.85rem' },
  th: { textAlign: 'left', padding: '0.6rem', borderBottom: '2px solid #e0e0e0', fontWeight: 600, fontSize: '0.8rem' },
  td: { padding: '0.5rem 0.6rem', borderBottom: '1px solid #f0f0f0', verticalAlign: 'top' },
  row: {},
  error: { padding: '0.75rem', background: '#fdecea', color: '#d32f2f', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' },
  resourceId: { display: 'block', fontSize: '0.7rem', color: '#888' },
  details: { fontSize: '0.7rem', color: '#666', wordBreak: 'break-all' as const },
};
