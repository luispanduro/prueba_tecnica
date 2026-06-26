import { useParams } from 'react-router-dom';
import UserDetail from '../features/users/components/UserDetail';
import ErrorMessage from '../shared/components/ErrorMessage';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <ErrorMessage message="ID de usuario no especificado" />;
  return (
    <div style={{ padding: '1.5rem' }}>
      <UserDetail userId={id} />
    </div>
  );
}
