'use client';
import type { CSSProperties } from 'react';

type Props = {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
};

export function Input({ label, value, onChange, placeholder, type = 'text', disabled, required, error }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
          {label}{required && <span style={{ color: 'var(--error)' }}> *</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          padding: '10px 12px',
          border: `1px solid ${error ? 'var(--error)' : 'var(--border)'}`,
          borderRadius: '8px',
          fontSize: '14px',
          color: 'var(--text-primary)',
          backgroundColor: disabled ? '#F8FAFC' : 'var(--surface)',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      {error && <span style={{ fontSize: '12px', color: 'var(--error)' }}>{error}</span>}
    </div>
  );
}