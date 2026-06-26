interface ErrorMessageProps {
  message: string;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
    >
      <span aria-hidden="true">&#9888;</span>
      <span>{message}</span>
    </div>
  );
}
