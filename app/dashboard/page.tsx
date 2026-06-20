import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
        Selamat datang, {user.full_name} 👋
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
        Role: {user.roles.join(', ')}
      </p>
    </div>
  );
}