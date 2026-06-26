interface AuditFilterValues {
  startDate: string;
  endDate: string;
  userId: string;
  eventType: string;
  service: string;
  status: string;
}

interface AuditFiltersProps {
  filters: AuditFilterValues;
  onChange: (filters: AuditFilterValues) => void;
  onApply: () => void;
  onReset: () => void;
}

export const DEFAULT_FILTERS: AuditFilterValues = {
  startDate: '',
  endDate: '',
  userId: '',
  eventType: '',
  service: '',
  status: '',
};

export default function AuditFilters({ filters, onChange, onApply, onReset }: AuditFiltersProps) {
  const set = (key: keyof AuditFilterValues, value: string) =>
    onChange({ ...filters, [key]: value });

  const inputStyle = {
    padding: '0.375rem 0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.85rem',
    width: '100%',
  };

  return (
    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem' }}>Desde</label>
          <input type="date" value={filters.startDate} onChange={(e) => set('startDate', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem' }}>Hasta</label>
          <input type="date" value={filters.endDate} onChange={(e) => set('endDate', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem' }}>Usuario ID</label>
          <input type="text" value={filters.userId} onChange={(e) => set('userId', e.target.value)} placeholder="UUID..." style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem' }}>Tipo de evento</label>
          <input type="text" value={filters.eventType} onChange={(e) => set('eventType', e.target.value)} placeholder="LOGIN..." style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem' }}>Servicio</label>
          <input type="text" value={filters.service} onChange={(e) => set('service', e.target.value)} placeholder="auth-service..." style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem' }}>Estado</label>
          <select value={filters.status} onChange={(e) => set('status', e.target.value)} style={inputStyle}>
            <option value="">Todos</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onReset} style={{ padding: '0.375rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.85rem' }}>
          Limpiar
        </button>
        <button type="button" onClick={onApply} style={{ padding: '0.375rem 0.75rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.85rem' }}>
          Aplicar filtros
        </button>
      </div>
    </div>
  );
}
