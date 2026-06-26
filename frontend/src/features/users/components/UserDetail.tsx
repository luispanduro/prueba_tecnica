import { useState } from 'react';
import { useGetUserQuery } from '../usersApi';
import { useToast } from '../../../shared/hooks/useToast';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import ErrorMessage from '../../../shared/components/ErrorMessage';
import RoleAssignmentModal from './RoleAssignmentModal';
import { formatDate } from '../../../shared/utils/formatters';

interface UserDetailProps {
  userId: string;
}

const statusColors: Record<string, string> = {
  active: '#16a34a',
  inactive: '#6b7280',
  suspended: '#dc2626',
};

export default function UserDetail({ userId }: UserDetailProps) {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const { data: user, isLoading, isError, error } = useGetUserQuery(userId);
  const { error: _e } = useToast();

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    const msg = (error as { data?: { message?: string } })?.data?.message ?? 'Error al cargar usuario';
    return <ErrorMessage message={msg} />;
  }
  if (!user) return null;

  return (
    <div style={{ maxWidth: '640px' }}>
      <h2 style={{ margin: '0 0 1.5rem' }}>{user.firstName} {user.lastName}</h2>

      <dl style={{ display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: '0.75rem', columnGap: '1rem', fontSize: '0.9rem' }}>
        <dt style={{ fontWeight: 600, color: '#374151' }}>Email</dt>
        <dd style={{ margin: 0 }}>{user.email}</dd>

        <dt style={{ fontWeight: 600, color: '#374151' }}>Estado</dt>
        <dd style={{ margin: 0, color: statusColors[user.status] ?? '#374151', fontWeight: 500, textTransform: 'capitalize' }}>
          {user.status}
        </dd>

        <dt style={{ fontWeight: 600, color: '#374151' }}>Creado</dt>
        <dd style={{ margin: 0 }}>{formatDate(user.createdAt)}</dd>

        <dt style={{ fontWeight: 600, color: '#374151' }}>Actualizado</dt>
        <dd style={{ margin: 0 }}>{formatDate(user.updatedAt)}</dd>
      </dl>

      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Roles asignados</h3>
          <button
            type="button"
            onClick={() => setShowRoleModal(true)}
            style={{ padding: '0.375rem 0.75rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Gestionar roles
          </button>
        </div>
        {user.roles.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Sin roles asignados</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {user.roles.map((role) => (
              <span key={role} style={{ padding: '0.25rem 0.6rem', background: '#dbeafe', color: '#1d4ed8', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 500 }}>
                {role}
              </span>
            ))}
          </div>
        )}
      </div>

      <RoleAssignmentModal
        isOpen={showRoleModal}
        userId={user.id}
        assignedRoleIds={user.roles}
        onClose={() => setShowRoleModal(false)}
      />
    </div>
  );
}
