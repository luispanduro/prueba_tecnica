import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateUserMutation, useUpdateUserMutation, type User } from '../usersApi';
import { useGetRolesQuery } from '../../roles/rolesApi';
import { useToast } from '../../../shared/hooks/useToast';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';

const createUserSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .optional(),
  roleIds: z.array(z.string().uuid()).min(1, 'Seleccione al menos un rol'),
});

type UserFormData = z.infer<typeof createUserSchema>;

interface UserFormProps {
  mode: 'create' | 'edit';
  user?: User;
  onSuccess: () => void;
}

export default function UserForm({ mode, user, onSuccess }: UserFormProps) {
  const toast = useToast();
  const { data: rolesData, isLoading: rolesLoading } = useGetRolesQuery();
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const isLoading = creating || updating;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      roleIds: [],
    },
  });

  const onSubmit: SubmitHandler<UserFormData> = async (data) => {
    try {
      if (mode === 'create') {
        await createUser({ ...data, password: data.password ?? '' }).unwrap();
        toast.success('Usuario creado correctamente');
      } else if (user) {
        const { password: _pw, roleIds: _r, ...updateData } = data;
        await updateUser({ id: user.id, ...updateData }).unwrap();
        toast.success('Usuario actualizado correctamente');
      }
      onSuccess();
    } catch {
      toast.error(mode === 'create' ? 'Error al crear usuario' : 'Error al actualizar usuario');
    }
  };

  const fieldStyle = { width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', boxSizing: 'border-box' as const };
  const errorStyle = { color: '#dc2626', fontSize: '0.8rem', marginTop: '0.2rem' };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.25rem', marginBottom: '1.5rem' }}
    >
      <h3 style={{ margin: '0 0 1rem' }}>{mode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Nombre</label>
          <input {...register('firstName')} style={fieldStyle} />
          {errors.firstName && <p style={errorStyle}>{errors.firstName.message}</p>}
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Apellido</label>
          <input {...register('lastName')} style={fieldStyle} />
          {errors.lastName && <p style={errorStyle}>{errors.lastName.message}</p>}
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Email</label>
        <input type="email" {...register('email')} style={fieldStyle} />
        {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
      </div>

      {mode === 'create' && (
        <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Contraseña</label>
          <input type="password" {...register('password')} style={fieldStyle} />
          {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Roles</label>
        {rolesLoading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {rolesData?.map((role) => (
              <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                <input type="checkbox" value={role.id} {...register('roleIds')} />
                {role.name}
              </label>
            ))}
          </div>
        )}
        {errors.roleIds && <p style={errorStyle}>{errors.roleIds.message}</p>}
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
