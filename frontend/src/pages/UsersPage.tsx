import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUsersStore } from '../store/users.store';
import { User } from '../types/user.types';

const createSchema = z.object({
  username: z.string().min(3, 'Min 3 characters').max(100),
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  password: z.string().min(6, 'Min 6 characters'),
});

const editSchema = z.object({
  username: z.string().min(3, 'Min 3 characters').max(100).optional(),
  email: z.string().email('Invalid email').optional(),
  firstName: z.string().min(1, 'Required').optional(),
  lastName: z.string().min(1, 'Required').optional(),
  isActive: z.boolean().optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

export function UsersPage() {
  const { users, isLoading, error, fetchUsers, createUser, updateUser, deleteUser, clearError } = useUsersStore();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) });
  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) });

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async (data: CreateForm) => {
    setFormError(null);
    try {
      await createUser(data);
      createForm.reset();
    } catch (e: unknown) {
      setFormError((e as Error).message);
    }
  };

  const handleEdit = async (data: EditForm) => {
    if (!editingUser) return;
    setFormError(null);
    try {
      await updateUser(editingUser.id, data);
      setEditingUser(null);
      editForm.reset();
    } catch (e: unknown) {
      setFormError((e as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await deleteUser(id); } catch { /* error shown via store */ }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    editForm.reset({ username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, isActive: user.isActive });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Users Management</h2>

      {error && <div style={s.error}>{error} <button onClick={clearError}>×</button></div>}
      {formError && <div style={s.error}>{formError} <button onClick={() => setFormError(null)}>×</button></div>}

      {/* Create Form */}
      <details open style={s.section}>
        <summary style={s.summary}>Create User</summary>
        <form onSubmit={createForm.handleSubmit(handleCreate)} style={s.form}>
          <div style={s.row}>
            <input {...createForm.register('username')} placeholder="Username" style={s.input} />
            {createForm.formState.errors.username && <span style={s.fieldErr}>{createForm.formState.errors.username.message}</span>}
          </div>
          <div style={s.row}>
            <input {...createForm.register('email')} placeholder="Email" style={s.input} />
            {createForm.formState.errors.email && <span style={s.fieldErr}>{createForm.formState.errors.email.message}</span>}
          </div>
          <div style={s.row}>
            <input {...createForm.register('firstName')} placeholder="First Name" style={s.input} />
            {createForm.formState.errors.firstName && <span style={s.fieldErr}>{createForm.formState.errors.firstName.message}</span>}
          </div>
          <div style={s.row}>
            <input {...createForm.register('lastName')} placeholder="Last Name" style={s.input} />
            {createForm.formState.errors.lastName && <span style={s.fieldErr}>{createForm.formState.errors.lastName.message}</span>}
          </div>
          <div style={s.row}>
            <input {...createForm.register('password')} type="password" placeholder="Password" style={s.input} />
            {createForm.formState.errors.password && <span style={s.fieldErr}>{createForm.formState.errors.password.message}</span>}
          </div>
          <button type="submit" style={s.btn} disabled={isLoading}>{isLoading ? 'Creating...' : 'Create User'}</button>
        </form>
      </details>

      {/* Edit Form */}
      {editingUser && (
        <div style={s.section}>
          <h3>Edit User: {editingUser.username}</h3>
          <form onSubmit={editForm.handleSubmit(handleEdit)} style={s.form}>
            <input {...editForm.register('username')} placeholder="Username" style={s.input} />
            <input {...editForm.register('email')} placeholder="Email" style={s.input} />
            <input {...editForm.register('firstName')} placeholder="First Name" style={s.input} />
            <input {...editForm.register('lastName')} placeholder="Last Name" style={s.input} />
            <div style={s.row}>
              <label><input type="checkbox" {...editForm.register('isActive')} /> Active</label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" style={s.btn} disabled={isLoading}>Save</button>
              <button type="button" style={s.btnSecondary} onClick={() => setEditingUser(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      {isLoading && !users.length ? <p>Loading...</p> : (
        <table style={s.table}>
          <thead>
            <tr><th>Username</th><th>Email</th><th>Name</th><th>Active</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.firstName} {u.lastName}</td>
                <td>{u.isActive ? '✓' : '✗'}</td>
                <td>
                  <button style={s.btnSm} onClick={() => startEdit(u)}>Edit</button>
                  <button style={s.btnSmDanger} onClick={() => handleDelete(u.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={5}>No users found</td></tr>}
          </tbody>
        </table>
      )}
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
  btnSecondary: { padding: '0.5rem 1rem', background: '#757575', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  btnSm: { padding: '0.25rem 0.5rem', marginRight: '0.25rem', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.75rem' },
  btnSmDanger: { padding: '0.25rem 0.5rem', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.75rem' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem', background: '#fff', borderRadius: '6px', overflow: 'hidden' },
  error: { padding: '0.75rem', background: '#fdecea', color: '#d32f2f', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' },
  fieldErr: { fontSize: '0.7rem', color: '#d32f2f' },
};
