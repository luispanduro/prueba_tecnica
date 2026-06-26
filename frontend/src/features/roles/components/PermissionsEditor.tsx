const PERMISSION_GROUPS: Record<string, string[]> = {
  users: ['users:read', 'users:write', 'users:delete', 'users:admin'],
  roles: ['roles:read', 'roles:write', 'roles:delete', 'roles:admin'],
  audit: ['audit:read', 'audit:admin'],
  ai: ['ai:query', 'ai:admin'],
};

interface PermissionsEditorProps {
  selected: string[];
  onChange: (permissions: string[]) => void;
}

export default function PermissionsEditor({ selected, onChange }: PermissionsEditorProps) {
  const toggle = (perm: string) => {
    const next = selected.includes(perm)
      ? selected.filter((p) => p !== perm)
      : [...selected, perm];
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {Object.entries(PERMISSION_GROUPS).map(([resource, perms]) => (
        <div key={resource}>
          <p style={{ margin: '0 0 0.4rem', fontWeight: 600, textTransform: 'capitalize', color: '#374151' }}>
            {resource}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {perms.map((perm) => (
              <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={selected.includes(perm)}
                  onChange={() => toggle(perm)}
                />
                <code style={{ background: '#f3f4f6', padding: '0.1rem 0.35rem', borderRadius: '0.25rem' }}>{perm}</code>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
