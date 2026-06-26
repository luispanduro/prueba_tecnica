import { useGetUsersQuery } from '../features/users/usersApi';
import { useGetRolesQuery } from '../features/roles/rolesApi';
import { useGetAuditLogsQuery } from '../features/audit/auditApi';
import LoadingSpinner from '../shared/components/LoadingSpinner';
import { formatDate } from '../shared/utils/formatters';

const statusColors: Record<string, string> = { success: '#16a34a', failure: '#dc2626' };

function StatCard({ label, value, loading }: { label: string; value: number | string; loading?: boolean }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem 1.5rem', flex: '1 1 180px' }}>
      <p style={{ margin: '0 0 0.35rem', fontSize: '0.8rem', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      {loading ? <LoadingSpinner size="sm" /> : (
        <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#111827' }}>{value}</p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: usersData, isLoading: usersLoading } = useGetUsersQuery({ page: 1, limit: 1 });
  const { data: roles, isLoading: rolesLoading } = useGetRolesQuery();
  const { data: auditData, isLoading: auditLoading } = useGetAuditLogsQuery({ page: 1, limit: 5 });

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.4rem', fontWeight: 700 }}>Dashboard</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Total usuarios" value={usersData?.total ?? 0} loading={usersLoading} />
        <StatCard label="Total roles" value={roles?.length ?? 0} loading={rolesLoading} />
        <StatCard label="Eventos recientes" value={auditData?.total ?? 0} loading={auditLoading} />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Últimos eventos de auditoría</h3>
        {auditLoading && <LoadingSpinner size="sm" />}
        {!auditLoading && auditData?.data.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Sin eventos recientes</p>
        )}
        {!auditLoading && auditData?.data.map((log) => (
          <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.85rem' }}>
            <span style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDate(log.timestamp)}</span>
            <span style={{ color: '#374151' }}>{log.service}</span>
            <code style={{ background: '#f3f4f6', padding: '0.1rem 0.35rem', borderRadius: '0.25rem', fontSize: '0.8rem' }}>{log.eventType}</code>
            <span style={{ marginLeft: 'auto', color: statusColors[log.status] ?? '#374151', fontWeight: 600, fontSize: '0.8rem' }}>
              {log.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
