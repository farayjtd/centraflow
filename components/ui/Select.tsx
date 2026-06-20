'use client';

type Option = { label: string; value: string };

type Props = {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
};

export function Select({ label, value, onChange, options, placeholder, disabled, required, error }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
          {label}{required && <span style={{ color: 'var(--error)' }}> *</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          padding: '10px 12px',
          border: `1px solid ${error ? 'var(--error)' : 'var(--border)'}`,
          borderRadius: '8px',
          fontSize: '14px',
          color: value ? 'var(--text-primary)' : 'var(--text-secondary)',
          backgroundColor: disabled ? '#F8FAFC' : 'var(--surface)',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box' as const,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <span style={{ fontSize: '12px', color: 'var(--error)' }}>{error}</span>}
    </div>
  );
}