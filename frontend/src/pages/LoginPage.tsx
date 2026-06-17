import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../store/auth.store';
import { authService } from '../services/auth.service';

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error, sessionExpired, setAuth, setLoading, setError, clearSessionExpired } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);
    clearSessionExpired();

    try {
      const response = await authService.login(data);
      setAuth(response.access_token, response.user);
      navigate('/');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || 'Invalid credentials';
      setError(message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>User Management System</h1>
        <h2 style={styles.subtitle}>Login</h2>

        {sessionExpired && (
          <div style={styles.infoMessage}>
            Your session has expired. Please log in again.
          </div>
        )}

        {error && (
          <div style={styles.errorMessage}>{error}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Username or Email</label>
            <input
              {...register('usernameOrEmail')}
              type="text"
              style={styles.input}
              placeholder="Enter username or email"
              disabled={isLoading}
            />
            {errors.usernameOrEmail && (
              <span style={styles.fieldError}>{errors.usernameOrEmail.message}</span>
            )}
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <input
              {...register('password')}
              type="password"
              style={styles.input}
              placeholder="Enter password"
              disabled={isLoading}
            />
            {errors.password && (
              <span style={styles.fieldError}>{errors.password.message}</span>
            )}
          </div>

          <button type="submit" style={styles.button} disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
  },
  card: {
    padding: '2.5rem',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  title: {
    textAlign: 'center',
    marginBottom: '0.25rem',
    fontSize: '1.25rem',
    color: '#333',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    fontSize: '1.5rem',
    color: '#1a1a1a',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#555',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    outline: 'none',
  },
  button: {
    padding: '0.75rem',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  fieldError: {
    fontSize: '0.75rem',
    color: '#d32f2f',
  },
  errorMessage: {
    padding: '0.75rem',
    backgroundColor: '#fdecea',
    color: '#d32f2f',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  infoMessage: {
    padding: '0.75rem',
    backgroundColor: '#fff3e0',
    color: '#e65100',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
};
