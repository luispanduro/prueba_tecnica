import { useState } from 'react';
import {
  useGetUsersQuery,
  useDeleteUserMutation,
  type User,
} from '../usersApi';
import { useToast } from '../../../shared/hooks/useToast';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import ErrorMessage from '../../../shared/components/ErrorMessage';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import UserForm from './UserForm';

const statusColors: Record<string, string> = {
  active: '#16a34a',
  inactive: '#6b7280',
  suspended: '#dc2626',
};

export default function UserList() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const { data, isLoading, isError, error } = useGetUsersQuery({ page, limit: 10 });
  const [deleteUser] = useDeleteUserMutation();

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      await deleteUser(deletingUser.id).unwrap();
      toast.success('Usuario eliminado');
    } catch {
      toast.error('Error al eliminar usuario');
    } finally {
      setDeletingUser(null);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    const msg = (error as { data?: { message?: string } })?.data?.message ?? 'Error al cargar usuarios';
    return <ErrorMessage message={msg} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Usuarios</h2>
        <button
          type="button"
          onClick={() => { setEditingUser(null); setShowForm(true); }}
          style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
        >
          + Nuevo Usuario
        </button>
      </div>

      {showForm && (
        <UserForm
          mode={editingUser ? 'edit' : 'create'}
          user={editingUser ?? undefined}
          onSuccess={() => { setShowForm(false); setEditingUser(null); }}
        />
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
            {['Nombre', 'Email', 'Estado', 'Roles', 'Acciones'].map((h) => (
              <th key={h} style={{ padding: '0.75rem 1rem', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data?.data.map((user) => (
            <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '0.75rem 1rem' }}>{user.firstName} {user.lastName}</td>
              <td style={{ padding: '0.75rem 1rem' }}>{user.email}</td>
              <td style={{ padding: '0.75rem 1rem' }}>
                <span style={{
                  color: statusColors[user.status] ?? '#374151',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                }}>
                  {user.status}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem' }}>{user.roles.join(', ') || '—'}</td>
              <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setEditingUser(user); setShowForm(true); }}
                  style={{ padding: '0.25rem 0.6rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingUser(user)}
                  style={{ padding: '0.25rem 0.6rem', border: '1px solid #dc2626', color: '#dc2626', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem', background: 'transparent' }}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {data ? `${data.total} usuarios en total` : ''}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '0.375rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
          >
            ← Anterior
          </button>
          <span style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}>Página {page}</span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={!data || page * 10 >= data.total}
            style={{ padding: '0.375rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: (!data || page * 10 >= data.total) ? 'not-allowed' : 'pointer', opacity: (!data || page * 10 >= data.total) ? 0.5 : 1 }}
          >
            Siguiente →
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deletingUser}
        title="Eliminar usuario"
        message={`¿Estás seguro de que deseas eliminar a ${deletingUser?.firstName} ${deletingUser?.lastName}? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setDeletingUser(null)}
      />
    </div>
  );
}
