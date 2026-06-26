import { useState } from 'react';
import { useGetRolesQuery, useDeleteRoleMutation, type Role } from '../rolesApi';
import { useToast } from '../../../shared/hooks/useToast';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import ErrorMessage from '../../../shared/components/ErrorMessage';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import RoleForm from './RoleForm';

export default function RoleList() {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  const { data: roles, isLoading, isError, error } = useGetRolesQuery();
  const [deleteRole] = useDeleteRoleMutation();

  const handleDelete = async () => {
    if (!deletingRole) return;
    try {
      await deleteRole(deletingRole.id).unwrap();
      toast.success('Rol eliminado');
    } catch {
      toast.error('Error al eliminar rol');
    } finally {
      setDeletingRole(null);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    const msg = (error as { data?: { message?: string } })?.data?.message ?? 'Error al cargar roles';
    return <ErrorMessage message={msg} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Roles</h2>
        <button
          type="button"
          onClick={() => { setEditingRole(null); setShowForm(true); }}
          style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
        >
          + Nuevo Rol
        </button>
      </div>

      {showForm && (
        <RoleForm
          mode={editingRole ? 'edit' : 'create'}
          role={editingRole ?? undefined}
          onSuccess={() => { setShowForm(false); setEditingRole(null); }}
        />
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
            {['Nombre', 'Descripción', 'Permisos', 'Sistema', 'Acciones'].map((h) => (
              <th key={h} style={{ padding: '0.75rem 1rem', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roles?.map((role) => (
            <tr key={role.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>
                <code style={{ background: '#f3f4f6', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.85rem' }}>
                  {role.name}
                </code>
              </td>
              <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>{role.description || '—'}</td>
              <td style={{ padding: '0.75rem 1rem' }}>
                <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: '9999px', padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: 600 }}>
                  {role.permissions.length}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem' }}>
                {role.isSystem ? (
                  <span style={{ color: '#16a34a', fontWeight: 500 }}>Sí</span>
                ) : (
                  <span style={{ color: '#6b7280' }}>No</span>
                )}
              </td>
              <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setEditingRole(role); setShowForm(true); }}
                  style={{ padding: '0.25rem 0.6rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Editar
                </button>
                {!role.isSystem && (
                  <button
                    type="button"
                    onClick={() => setDeletingRole(role)}
                    style={{ padding: '0.25rem 0.6rem', border: '1px solid #dc2626', color: '#dc2626', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem', background: 'transparent' }}
                  >
                    Eliminar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        isOpen={!!deletingRole}
        title="Eliminar rol"
        message={`¿Estás seguro de que deseas eliminar el rol "${deletingRole?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setDeletingRole(null)}
      />
    </div>
  );
}
