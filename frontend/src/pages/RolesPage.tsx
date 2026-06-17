import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRolesStore } from '../store/roles.store';

const createRoleSchema = z.object({
  name: z.string().min(1, 'Required').max(50, 'Max 50 characters'),
  description: z.string().max(255).optional(),
});

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const assignSchema = z.object({
  userId: z.string().regex(uuidRegex, 'Must be a valid UUID'),
  roleId: z.string().regex(uuidRegex, 'Must be a valid UUID'),
});

type CreateRoleForm = z.infer<typeof createRoleSchema>;
type AssignForm = z.infer<typeof assignSchema>;

export function RolesPage() {
  const { roles, isLoading, error, fetchRoles, createRole, deleteRole, assignRole, unassignRole, clearError } = useRolesStore();
  const [formError, setFormError] = useState<string | null>(null);

  const createForm = useForm<CreateRoleForm>({ resolver: zodResolver(createRoleSchema) });
  const assignForm = useForm<AssignForm>({ resolver: zodResolver(assignSchema) });
  const unassignForm = useForm<AssignForm>({ resolver: zodResolver(assignSchema) });

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const handleCreate = async (data: CreateRoleForm) => {
    setFormError(null);
    try {
      await createRole(data);
      createForm.reset();
    } catch (e: unknown) { setFormError((e as Error).message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this role and all its assignments?')) return;
    try { await deleteRole(id); } catch { /* shown via store */ }
  };

  const handleAssign = async (data: AssignForm) => {
    setFormError(null);
    try {
      await assignRole(data);
      assignForm.reset();
    } catch (e: unknown) { setFormError((e as Error).message); }
  };

  const handleUnassign = async (data: AssignForm) => {
    setFormError(null);
    try {
      await unassignRole(data);
      unassignForm.reset();
    } catch (e: unknown) { setFormError((e as Error).message); }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Roles Management</h2>

      {error && <div style={s.error}>{error} <button onClick={clearError}>×</button></div>}
      {formError && <div style={s.error}>{formError} <button onClick={() => setFormError(null)}>×</button></div>}

      {/* Create Role */}
      <details open style={s.section}>
        <summary style={s.summary}>Create Role</summary>
        <form onSubmit={createForm.handleSubmit(handleCreate)} style={s.form}>
          <div style={s.row}>
            <input {...createForm.register('name')} placeholder="Role name" style={s.input} />
            {createForm.formState.errors.name && <span style={s.fieldErr}>{createForm.formState.errors.name.message}</span>}
          </div>
          <div style={s.row}>
            <input {...createForm.register('description')} placeholder="Description (optional)" style={s.input} />
          </div>
          <button type="submit" style={s.btn} disabled={isLoading}>{isLoading ? 'Creating...' : 'Create Role'}</button>
        </form>
      </details>

      {/* Roles Table */}
      {isLoading && !roles.length ? <p>Loading...</p> : (
        <table style={s.table}>
          <thead>
            <tr><th>Name</th><th>Description</th><th>ID</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.description || '—'}</td>
                <td style={{ fontSize: '0.7rem', color: '#888' }}>{r.id}</td>
                <td><button style={s.btnSmDanger} onClick={() => handleDelete(r.id)}>Delete</button></td>
              </tr>
            ))}
            {roles.length === 0 && <tr><td colSpan={4}>No roles found</td></tr>}
          </tbody>
        </table>
      )}

      {/* Assign Role */}
      <details style={s.section}>
        <summary style={s.summary}>Assign Role to User</summary>
        <form onSubmit={assignForm.handleSubmit(handleAssign)} style={s.form}>
          <div style={s.row}>
            <input {...assignForm.register('userId')} placeholder="User ID (UUID)" style={s.input} />
            {assignForm.formState.errors.userId && <span style={s.fieldErr}>{assignForm.formState.errors.userId.message}</span>}
          </div>
          <div style={s.row}>
            <input {...assignForm.register('roleId')} placeholder="Role ID (UUID)" style={s.input} />
            {assignForm.formState.errors.roleId && <span style={s.fieldErr}>{assignForm.formState.errors.roleId.message}</span>}
          </div>
          <button type="submit" style={s.btn} disabled={isLoading}>{isLoading ? 'Assigning...' : 'Assign Role'}</button>
        </form>
      </details>

      {/* Unassign Role */}
      <details style={s.section}>
        <summary style={s.summary}>Unassign Role from User</summary>
        <form onSubmit={unassignForm.handleSubmit(handleUnassign)} style={s.form}>
          <div style={s.row}>
            <input {...unassignForm.register('userId')} placeholder="User ID (UUID)" style={s.input} />
            {unassignForm.formState.errors.userId && <span style={s.fieldErr}>{unassignForm.formState.errors.userId.message}</span>}
          </div>
          <div style={s.row}>
            <input {...unassignForm.register('roleId')} placeholder="Role ID (UUID)" style={s.input} />
            {unassignForm.formState.errors.roleId && <span style={s.fieldErr}>{unassignForm.formState.errors.roleId.message}</span>}
          </div>
          <button type="submit" style={s.btnSecondary} disabled={isLoading}>{isLoading ? 'Removing...' : 'Unassign Role'}</button>
        </form>
      </details>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  section: { marginBottom: '1.5rem', padding: '1rem', background: '#fff', borderRadius: '6px', border: '1px solid #e0e0e0' },
  summary: { cursor: 'pointer', fontWeight: 600, marginBottom: '0.5rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px' },
  row: { display: 'flex', flexDirection: 'column' },
  input: { padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.9rem' },
  btn: { padding: '0.5rem 1rem', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 },
  btnSecondary: { padding: '0.5rem 1rem', background: '#757575', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 },
  btnSmDanger: { padding: '0.25rem 0.5rem', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.75rem' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem', background: '#fff', borderRadius: '6px', overflow: 'hidden' },
  error: { padding: '0.75rem', background: '#fdecea', color: '#d32f2f', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' },
  fieldErr: { fontSize: '0.7rem', color: '#d32f2f' },
};
