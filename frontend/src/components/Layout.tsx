import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>User Management</h1>
          <nav style={styles.nav}>
            <NavLink to="/" style={({ isActive }) => ({ ...styles.navLink, fontWeight: isActive ? 700 : 400 })}>Home</NavLink>
            <NavLink to="/users" style={({ isActive }) => ({ ...styles.navLink, fontWeight: isActive ? 700 : 400 })}>Users</NavLink>
            <NavLink to="/roles" style={({ isActive }) => ({ ...styles.navLink, fontWeight: isActive ? 700 : 400 })}>Roles</NavLink>
            <NavLink to="/audit" style={({ isActive }) => ({ ...styles.navLink, fontWeight: isActive ? 700 : 400 })}>Audit</NavLink>
            <NavLink to="/ai" style={({ isActive }) => ({ ...styles.navLink, fontWeight: isActive ? 700 : 400 })}>AI</NavLink>
          </nav>
        </div>
        <div style={styles.userInfo}>
          <span>{user?.username}</span>
          <span style={styles.roleBadge}>{user?.roles?.join(', ')}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', backgroundColor: '#f5f5f5' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 2rem', backgroundColor: '#1976d2', color: '#fff' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '2rem' },
  title: { fontSize: '1.1rem', margin: 0 },
  nav: { display: 'flex', gap: '1rem' },
  navLink: { color: '#fff', textDecoration: 'none', fontSize: '0.9rem' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' },
  logoutBtn: { padding: '0.3rem 0.6rem', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
};
