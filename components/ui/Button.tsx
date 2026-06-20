'use client';
import type { CSSProperties, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variants: Record<ButtonVariant, CSSProperties> = {
  primary:   { backgroundColor: 'var(--primary)', color: '#fff', border: 'none' },
  secondary: { backgroundColor: 'transparent', color: 'var(--primary)', border: '1.5px solid var(--primary)' },
  danger:    { backgroundColor: '#EF4444', color: '#fff', border: 'none' },
  ghost:     { backgroundColor: 'transparent', color: 'var(--text-secondary)', border: 'none' },
};

type Props = {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  size?: 'sm' | 'md';
};

export function Button({
  children, onClick, variant = 'primary',
  disabled, type = 'button', fullWidth, size = 'md',
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variants[variant],
        padding: size === 'sm' ? '6px 12px' : '10px 20px',
        borderRadius: '8px',
        fontSize: size === 'sm' ? '13px' : '14px',
        fontWeight: '600',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        width: fullWidth ? '100%' : 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'opacity 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}