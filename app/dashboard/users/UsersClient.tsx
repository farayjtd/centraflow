'use client';

import { useState, useTransition, useRef } from 'react';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { createUser, updateUser, deleteUser } from '@/app/actions/users';
import type { AppRole } from '@/lib/types';

const ALL_ROLES: AppRole[] = ['Admin', 'Owner', 'Teknik_Sipil', 'Kepala_WH', 'Mandor', 'Tukang', 'Sopir'];

type User = {
  id: string;
  display_id: string;
  full_name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  roles: AppRole[];
  created_at: string;
};

type Props = {
  users: User[];
  currentUserId: string;
};

const emptyForm = {
  full_name: '', username: '', email: '', password: '',
  phone: '', roles: [] as AppRole[], is_active: true, avatar_url: '',
};

export function UsersClient({ users, currentUserId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [deleteModal, setDeleteModal] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredUsers = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setSelectedUser(null);
    setForm(emptyForm);
    setAvatarPreview(null);
    setAvatarFile(null);
    setError('');
    setModalMode('create');
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setForm({
      full_name: user.full_name,
      username: user.username ?? '',
      email: user.email ?? '',
      password: '',
      phone: user.phone ?? '',
      roles: user.roles,
      is_active: user.is_active,
      avatar_url: user.avatar_url ?? '',
    });
    setAvatarPreview(user.avatar_url);
    setAvatarFile(null);
    setError('');
    setModalMode('edit');
  };

  const openDetail = (user: User) => {
    setSelectedUser(user);
    setModalMode('detail');
  };

  const toggleRole = (role: AppRole) => {
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatarFile = async (file: File): Promise<string | null> => {
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: fd });
      const result = await res.json();
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.url;
    } catch {
      setError('Gagal upload foto profil.');
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = () => {
    if (!form.full_name.trim()) return setError('Nama lengkap harus diisi.');
    if (!form.username.trim()) return setError('Username harus diisi.');
    if (modalMode === 'create' && !form.email.trim()) return setError('Email harus diisi.');
    if (modalMode === 'create' && !form.password.trim()) return setError('Password harus diisi.');
    if (form.roles.length === 0) return setError('Pilih minimal satu role.');
    setError('');

    startTransition(async () => {
      try {
        // Upload avatar dulu kalau ada file baru
        let avatarUrl = form.avatar_url || undefined;
        if (avatarFile) {
          const uploaded = await uploadAvatarFile(avatarFile);
          if (!uploaded) return;
          avatarUrl = uploaded;
        }

        let result;
        if (modalMode === 'create') {
          result = await createUser({
            full_name: form.full_name,
            username: form.username,
            email: form.email,
            password: form.password,
            phone: form.phone,
            roles: form.roles,
            avatar_url: avatarUrl,
          });
        } else if (modalMode === 'edit' && selectedUser) {
          result = await updateUser(selectedUser.id, {
            full_name: form.full_name,
            username: form.username,
            email: form.email,
            phone: form.phone,
            is_active: form.is_active,
            roles: form.roles,
            password: form.password || undefined,
            avatar_url: avatarUrl,
          });
        }

        if (result?.error) {
          setError(result.error);
        } else {
          setModalMode(null);
        }
      } catch {
        setError('Terjadi kesalahan. Silakan coba lagi.');
      }
    });
  };

  const confirmDelete = () => {
    if (!deleteModal) return;
    startTransition(async () => {
      await deleteUser(deleteModal.id);
      setDeleteModal(null);
    });
  };

  const columns = [
    { key: 'display_id', label: 'ID', width: '90px' },
    {
      key: 'full_name', label: 'User',
      render: (u: User) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            backgroundColor: 'var(--primary)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {u.avatar_url ? (
              <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: '700' }}>
                {u.full_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>{u.full_name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>@{u.username}</div>
          </div>
        </div>
      ),
    },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'No. HP', render: (u: User) => u.phone ?? '-' },
    {
      key: 'roles', label: 'Role',
      render: (u: User) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {u.roles.map((r) => <Badge key={r} label={r} variant="info" />)}
        </div>
      ),
    },
    {
      key: 'is_active', label: 'Status',
      render: (u: User) => (
        <Badge label={u.is_active ? 'Aktif' : 'Nonaktif'} variant={u.is_active ? 'success' : 'error'} />
      ),
    },
    {
      key: 'actions', label: 'Aksi', width: '200px',
      render: (u: User) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <Button size="sm" variant="ghost" onClick={() => openDetail(u)}>Detail</Button>
          <Button size="sm" variant="secondary" onClick={() => openEdit(u)}>Edit</Button>
          {u.id !== currentUserId && (
            <Button size="sm" variant="danger" onClick={() => setDeleteModal(u)}>Hapus</Button>
          )}
        </div>
      ),
    },
  ];

  const renderForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {error && (
        <div style={{
          backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: '8px', padding: '10px 12px',
          color: 'var(--error)', fontSize: '13px',
        }}>{error}</div>
      )}

      {/* Avatar Upload */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '80px', height: '80px', borderRadius: '50%',
            backgroundColor: avatarPreview ? 'transparent' : 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', overflow: 'hidden',
            border: '3px dashed var(--border)',
          }}
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ color: '#fff', fontSize: '28px', fontWeight: '700' }}>
              {form.full_name ? form.full_name.charAt(0).toUpperCase() : '📷'}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            fontSize: '12px', color: 'var(--primary)', background: 'none',
            border: 'none', cursor: 'pointer', fontWeight: '600',
          }}
        >
          {uploadingAvatar ? 'Mengupload...' : avatarPreview ? 'Ganti Foto' : 'Upload Foto'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleAvatarChange}
        />
      </div>

      <Input label="Nama Lengkap" value={form.full_name}
        onChange={(v) => setForm({ ...form, full_name: v })} required />
      <Input label="Username" value={form.username}
        onChange={(v) => setForm({ ...form, username: v })} required />
      <Input label="Email" type="email" value={form.email}
        onChange={(v) => setForm({ ...form, email: v })}
        required={modalMode === 'create'}
        disabled={modalMode === 'edit'} />
      <Input
        label={modalMode === 'edit' ? 'Password Baru (kosongkan jika tidak ingin mengubah)' : 'Password'}
        type="password" value={form.password}
        onChange={(v) => setForm({ ...form, password: v })}
        required={modalMode === 'create'}
      />
      <Input label="No. HP" value={form.phone}
        onChange={(v) => setForm({ ...form, phone: v })} placeholder="08xx..." />

      {/* Status — edit only */}
      {modalMode === 'edit' && (
        <div>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
            Status
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[{ label: 'Aktif', value: true }, { label: 'Nonaktif', value: false }].map((opt) => (
              <label key={String(opt.value)} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                border: `1.5px solid ${form.is_active === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                backgroundColor: form.is_active === opt.value ? '#EFF6FF' : 'transparent',
                fontSize: '13px',
                color: form.is_active === opt.value ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: form.is_active === opt.value ? '600' : '400',
              }}>
                <input type="radio" name="is_active"
                  checked={form.is_active === opt.value}
                  onChange={() => setForm({ ...form, is_active: opt.value })}
                  style={{ display: 'none' }} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Roles */}
      <div>
        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
          Role <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {ALL_ROLES.map((role) => (
            <label key={role} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px',
              border: `1.5px solid ${form.roles.includes(role) ? 'var(--primary)' : 'var(--border)'}`,
              backgroundColor: form.roles.includes(role) ? '#EFF6FF' : 'transparent',
              cursor: 'pointer', fontSize: '13px',
              color: form.roles.includes(role) ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: form.roles.includes(role) ? '600' : '400',
              userSelect: 'none',
            }}>
              <input type="checkbox" checked={form.roles.includes(role)}
                onChange={() => toggleRole(role)} style={{ display: 'none' }} />
              {role}
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDetail = () => {
    if (!selectedUser) return null;
    const rows = [
      { label: 'ID', value: selectedUser.display_id },
      { label: 'Nama Lengkap', value: selectedUser.full_name },
      { label: 'Username', value: selectedUser.username ?? '-' },
      { label: 'Email', value: selectedUser.email ?? '-' },
      { label: 'No. HP', value: selectedUser.phone ?? '-' },
      { label: 'Password', value: '••••••••  (tidak dapat ditampilkan)' },
      { label: 'Status', value: selectedUser.is_active ? 'Aktif' : 'Nonaktif' },
      {
        label: 'Dibuat', value: new Date(selectedUser.created_at).toLocaleDateString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      },
    ];

    return (
      <div>
        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            backgroundColor: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', marginBottom: '8px',
          }}>
            {selectedUser.avatar_url ? (
              <img src={selectedUser.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#fff', fontSize: '28px', fontWeight: '700' }}>
                {selectedUser.full_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)' }}>
            {selectedUser.full_name}
          </div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {selectedUser.roles.map((r) => <Badge key={r} label={r} variant="info" />)}
          </div>
        </div>

        {/* Info rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map((row, i) => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0',
              borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', minWidth: '120px' }}>
                {row.label}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600', textAlign: 'right' }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Manajemen Users
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {users.length} user terdaftar
          </p>
        </div>
        <Button onClick={openCreate}>+ Tambah User</Button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '16px', maxWidth: '320px' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, username, email..."
          style={{
            width: '100%', padding: '10px 12px',
            border: '1px solid var(--border)', borderRadius: '8px',
            fontSize: '14px', color: 'var(--text-primary)',
            backgroundColor: 'var(--surface)', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: 'var(--surface)', borderRadius: '12px',
        border: '1px solid var(--border)', overflow: 'hidden',
      }}>
        <Table columns={columns} data={filteredUsers}
          keyExtractor={(u) => u.id} emptyText="Belum ada user" />
      </div>

      {/* Modal Create */}
      <Modal
        open={modalMode === 'create'}
        onClose={() => setModalMode(null)}
        title="Tambah User Baru"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending || uploadingAvatar}>
              {isPending ? 'Menyimpan...' : 'Buat User'}
            </Button>
          </>
        }
      >
        {renderForm()}
      </Modal>

      {/* Modal Edit */}
      <Modal
        open={modalMode === 'edit'}
        onClose={() => setModalMode(null)}
        title={`Edit User — ${selectedUser?.full_name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending || uploadingAvatar}>
              {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </>
        }
      >
        {renderForm()}
      </Modal>

      {/* Modal Detail */}
      <Modal
        open={modalMode === 'detail'}
        onClose={() => setModalMode(null)}
        title="Detail User"
        width={440}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Tutup</Button>
            <Button onClick={() => { setModalMode(null); openEdit(selectedUser!); }}>Edit User</Button>
          </>
        }
      >
        {renderDetail()}
      </Modal>

      {/* Modal Hapus */}
      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Konfirmasi Hapus Permanen"
        width={400}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Batal</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isPending}>
              {isPending ? 'Menghapus...' : 'Ya, Hapus Permanen'}
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          User <strong style={{ color: 'var(--text-primary)' }}>{deleteModal?.full_name}</strong> akan dihapus permanen
          beserta seluruh data terkait. Tindakan ini <strong style={{ color: 'var(--error)' }}>tidak dapat dibatalkan</strong>.
        </p>
      </Modal>
    </div>
  );
}