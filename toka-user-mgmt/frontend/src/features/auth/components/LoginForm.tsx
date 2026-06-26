import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../authApi';
import { useToast } from '../../../shared/hooks/useToast';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [login, { isLoading }] = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data).unwrap();
      toast.success('Inicio de sesión exitoso');
      navigate('/');
    } catch {
      toast.error('Credenciales inválidas. Verifica tu email y contraseña.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label htmlFor="email" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
        />
        {errors.email && (
          <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>{errors.email.message}</span>
        )}
      </div>

      <div>
        <label htmlFor="password" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
        />
        {errors.password && (
          <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>{errors.password.message}</span>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        style={{
          padding: '0.625rem 1rem',
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: '0.375rem',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}
      >
        {isLoading ? <LoadingSpinner size="sm" /> : 'Iniciar sesión'}
      </button>
    </form>
  );
}
