'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { UserProfile, AppRole } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

type MenuItem = {
  label: string;
  href: string;
  icon: string;
  roles: AppRole[];
};

const menuItems: MenuItem[] = [
  { label: 'Dashboard',         href: '/dashboard',                    icon: '⊞', roles: ['Admin','Owner','Teknik_Sipil','Kepala_WH','Mandor','Tukang','Sopir'] },
  { label: 'Users',             href: '/dashboard/users',              icon: '👥', roles: ['Admin'] },
  { label: 'Gudang',            href: '/dashboard/gudang',             icon: '🏭', roles: ['Admin','Kepala_WH'] },
  { label: 'Truk',              href: '/dashboard/truk',               icon: '🚛', roles: ['Admin','Kepala_WH','Sopir'] },
  { label: 'Kategori Material', href: '/dashboard/kategori-material',  icon: '🏷️', roles: ['Admin','Teknik_Sipil'] },
  { label: 'Material',          href: '/dashboard/material',           icon: '📦', roles: ['Admin','Teknik_Sipil','Kepala_WH'] },
  { label: 'Stok',              href: '/dashboard/stok',               icon: '📊', roles: ['Admin','Owner','Kepala_WH'] },
  { label: 'Proyek',            href: '/dashboard/proyek',             icon: '🏗️', roles: ['Admin','Owner','Teknik_Sipil','Kepala_WH','Mandor'] },
  { label: 'Material Request',  href: '/dashboard/material-request',   icon: '📋', roles: ['Admin','Kepala_WH','Mandor'] },
  { label: 'Foto Progres',      href: '/dashboard/foto-progres',       icon: '📷', roles: ['Admin','Teknik_Sipil','Kepala_WH','Mandor'] },
  { label: 'Absensi',          href: '/dashboard/absensi',            icon: '📅', roles: ['Admin','Owner','Mandor','Tukang','Sopir'] },
  { label: 'Pengiriman',        href: '/dashboard/pengiriman',         icon: '🚚', roles: ['Admin','Owner','Kepala_WH','Mandor','Sopir'] },
];

export function SidebarClient({ user }: { user: UserProfile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const visibleMenus = menuItems.filter((item) =>
    item.roles.some((r) => user.roles.includes(r))
  );

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside style={{
      width: '240px',
      minHeight: '100vh',
      backgroundColor: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflow: 'auto',
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <div style={{
          width: '36px', height: '36px',
          borderRadius: '10px',
          backgroundColor: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: '700', fontSize: '14px', flexShrink: 0,
        }}>CF</div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>CentraFlow</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{user.roles[0]}</div>
        </div>
      </div>

      {/* Menu */}
      <nav style={{ flex: 1, padding: '8px' }}>
        {visibleMenus.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '2px',
                backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? '600' : '400',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {user.full_name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {user.email}
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#FEF2F2',
            color: '#EF4444',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          {loggingOut ? 'Keluar...' : 'Keluar'}
        </button>
      </div>
    </aside>
  );
}