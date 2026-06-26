interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ background: '#fff', borderRadius: '0.5rem', padding: '1.5rem', minWidth: '320px', maxWidth: '480px' }}>
        <h2 id="dialog-title" style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600 }}>{title}</h2>
        <p style={{ margin: '0 0 1.25rem', color: '#374151' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" onClick={onCancel} style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
