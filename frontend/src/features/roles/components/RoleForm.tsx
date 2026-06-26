import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateRoleMutation, useUpdateRoleMutation, type Role } from '../rolesApi';
import { useToast } from '../../../shared/hooks/useToast';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import PermissionsEditor from './PermissionsEditor';

const roleSchema = z.object({
  name: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[A-Z0-9_]+$/, 'Solo mayúsculas, números y guiones bajos'),
  description: z.string().optional(),
  permissions: z.array(z.string().regex(/^\w+:\w+$/, 'Formato: resource:action')),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleFormProps {
  mode: 'create' | 'edit';
  role?: Role;
  onSuccess: () => void;
}

export default function RoleForm({ mode, role, onSuccess }: RoleFormProps) {
  const toast = useToast();
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);
  const [createRole, { isLoading: creating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: updating }] = useUpdateRoleMutation();
  const isLoading = creating || updating;

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: role?.name ?? '',
      description: role?.description ?? '',
      permissions: role?.permissions ?? [],
    },
  });

  const handlePermissionsChange = (next: string[]) => {
    setPermissions(next);
    setValue('permissions', next);
  };

  const onSubmit: SubmitHandler<RoleFormData> = async (data) => {
    try {
      if (mode === 'create') {
        await createRole({ ...data, permissions }).unwrap();
        toast.success('Rol creado correctamente');
      } else if (role) {
        await updateRole({ id: role.id, ...data, permissions }).unwrap();
        toast.success('Rol actualizado correctamente');
      }
      onSuccess();
    } catch {
      toast.error(mode === 'create' ? 'Error al crear rol' : 'Error al actualizar rol');
    }
  };

  const fieldStyle = { width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', boxSizing: 'border-box' as const };
  const errorStyle = { color: '#dc2626', fontSize: '0.8rem', marginTop: '0.2rem' };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.25rem', marginBottom: '1.5rem' }}
    >
      <h3 style={{ margin: '0 0 1rem' }}>{mode === 'create' ? 'Nuevo Rol' : 'Editar Rol'}</h3>

      <div>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Nombre</label>
        <input {...register('name')} placeholder="ADMIN_ROLE" style={fieldStyle} />
        {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Descripción</label>
        <input {...register('description')} style={fieldStyle} />
      </div>

      <div style={{ marginTop: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Permisos</label>
        <PermissionsEditor selected={permissions} onChange={handlePermissionsChange} />
        {errors.permissions && <p style={errorStyle}>{errors.permissions.message}</p>}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onSuccess} style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer' }}>
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? <LoadingSpinner size="sm" /> : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
