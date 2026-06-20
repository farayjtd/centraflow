import type { CSSProperties } from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

const variantStyles: Record<BadgeVariant, CSSProperties> = {
  success: { backgroundColor: '#DCFCE7', color: '#166534' },
  warning: { backgroundColor: '#FEF9C3', color: '#854D0E' },
  error:   { backgroundColor: '#FEE2E2', color: '#991B1B' },
  info:    { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  default: { backgroundColor: '#F1F5F9', color: '#475569' },
};

export function Badge({ label, variant = 'default' }: { label: string; variant?: BadgeVariant }) {
  return (
    <span style={{
      ...variantStyles[variant],
      padding: '2px 10px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-block',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}