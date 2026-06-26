import { useState } from 'react';
import { useGetRolesQuery } from '../../roles/rolesApi';
import { useAssignRoleMutation, useRemoveRoleMutation } from '../usersApi';
import { useToast } from '../../../shared/hooks/useToast';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';

interface RoleAssignmentModalProps {
  isOpen: boolean;
  userId: string;
  assignedRoleIds: string[];
  onClose: () => void;
}

export default function RoleAssignmentModal({ isOpen, userId, assignedRoleIds, onClose }: RoleAssignmentModalProps) {
  const toast = useToast();
  const { data: roles, isLoading: rolesLoading } = useGetRolesQuery();
  const [assignRole] = useAssignRoleMutation();
  const [removeRole] = useRemoveRoleMutation();
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedRoleIds));
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const toggle = (roleId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(roleId) ? next.delete(roleId) : next.add(roleId);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const original = new Set(assignedRoleIds);
      const toAdd = [...selected].filter((id) => !original.has(id));
      const toRemove = [...original].filter((id) => !selected.has(id));

      await Promise.all([
        ...toAdd.map((roleId) => assignRole({ userId, roleId }).unwrap()),
        ...toRemove.map((roleId) => removeRole({ userId, roleId }).unwrap()),
      ]);
      toast.success('Roles actualizados');
      onClose();
    } catch {
      toast.error('Error al actualizar roles');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}
    >
      <div style={{ background: '#fff', borderRadius: '0.5rem', padding: '1.5rem', minWidth: '360px', maxWidth: '480px', width: '100%' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 600 }}>Asignar Roles</h2>

        {rolesLoading ? (
          <LoadingSpinner />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto' }}>
            {roles?.map((role) => (
              <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selected.has(role.id)}
                  onChange={() => toggle(role.id)}
                />
                <span style={{ fontWeight: 500 }}>{role.name}</span>
                {role.description && <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>— {role.description}</span>}
              </label>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button type="button" onClick={onClose} style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? <LoadingSpinner size="sm" /> : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
