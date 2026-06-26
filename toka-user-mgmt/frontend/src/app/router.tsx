import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../shared/components/ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import UsersPage from '../pages/UsersPage';
import UserDetailPage from '../pages/UserDetailPage';
import RolesPage from '../pages/RolesPage';
import AuditPage from '../pages/AuditPage';
import AIAssistantPage from '../pages/AIAssistantPage';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:id" element={<UserDetailPage />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/ai" element={<AIAssistantPage />} />
      </Route>
    </Routes>
  );
}
