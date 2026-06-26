interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { width: '1rem', height: '1rem', borderWidth: '2px' },
  md: { width: '2rem', height: '2rem', borderWidth: '3px' },
  lg: { width: '3rem', height: '3rem', borderWidth: '4px' },
};

export default function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const s = sizeMap[size];
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div
        role="status"
        aria-label="Cargando"
        style={{
          width: s.width,
          height: s.height,
          borderWidth: s.borderWidth,
          borderStyle: 'solid',
          borderColor: '#3b82f6 transparent transparent transparent',
          borderRadius: '50%',
          animation: 'spin 0.75s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
