import { ReactNode } from 'react';

type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  width?: string;
};

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  emptyText?: string;
  keyExtractor: (row: T) => string;
};

export function Table<T>({ columns, data, emptyText = 'Tidak ada data', keyExtractor }: Props<T>) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
            {columns.map((col) => (
              <th key={col.key} style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
                width: col.width,
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{
                padding: '40px', textAlign: 'center',
                color: 'var(--text-secondary)', fontSize: '14px',
              }}>
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={keyExtractor(row)} style={{
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.1s',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: '14px 16px', color: 'var(--text-primary)', verticalAlign: 'middle' }}>
                    {col.render ? col.render(row) : String((row as any)[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}