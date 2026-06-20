import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { SidebarClient } from '@/components/dashboard/SidebarClient';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      <SidebarClient user={user} />
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}