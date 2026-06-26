import LoginForm from '../features/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f3f4f6',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '0.75rem',
        padding: '2rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      }}>
        <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 700, textAlign: 'center' }}>
          Toka — Iniciar sesión
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
