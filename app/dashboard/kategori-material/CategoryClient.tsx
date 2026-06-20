'use client';

import { useState, useTransition } from 'react';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { createCategory, updateCategory, deleteCategory } from '@/app/actions/categories';

type Category = {
  id: string;
  display_id: string;
  name: string;
  created_at: string;
};

type Props = { categories: Category[] };

export function CategoryClient({ categories }: Props) {
  const [isPending, startTransition] = useTransition();
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [deleteModal, setDeleteModal] = useState<Category | null>(null);
  const [selected, setSelected] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setSelected(null);
    setName('');
    setError('');
    setModalMode('create');
  };

  const openEdit = (c: Category) => {
    setSelected(c);
    setName(c.name);
    setError('');
    setModalMode('edit');
  };

  const handleSubmit = () => {
    if (!name.trim()) return setError('Nama kategori harus diisi.');
    setError('');

    startTransition(async () => {
      const result = modalMode === 'create'
        ? await createCategory(name)
        : await updateCategory(selected!.id, name);

      if (result?.error) setError(result.error);
      else setModalMode(null);
    });
  };

  const confirmDelete = () => {
    if (!deleteModal) return;
    startTransition(async () => {
      const result = await deleteCategory(deleteModal.id);
      if (result?.error) {
        setError(result.error);
      }
      setDeleteModal(null);
    });
  };

  const columns = [
    { key: 'display_id', label: 'ID', width: '100px' },
    {
      key: 'name', label: 'Nama Kategori',
      render: (c: Category) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            backgroundColor: '#EFF6FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', flexShrink: 0,
          }}>🏷️</div>
          <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>
            {c.name}
          </span>
        </div>
      ),
    },
    {
      key: 'created_at', label: 'Dibuat',
      render: (c: Category) => new Date(c.created_at).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
      }),
    },
    {
      key: 'actions', label: 'Aksi', width: '140px',
      render: (c: Category) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteModal(c)}>Hapus</Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Kategori Material
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {categories.length} kategori terdaftar
          </p>
        </div>
        <Button onClick={openCreate}>+ Tambah Kategori</Button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '16px', maxWidth: '320px' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari kategori..."
          style={{
            width: '100%', padding: '10px 12px',
            border: '1px solid var(--border)', borderRadius: '8px',
            fontSize: '14px', color: 'var(--text-primary)',
            backgroundColor: 'var(--surface)', outline: 'none',
            boxSizing: 'border-box' as const,
          }}
        />
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: 'var(--surface)', borderRadius: '12px',
        border: '1px solid var(--border)', overflow: 'hidden',
      }}>
        <Table columns={columns} data={filtered}
          keyExtractor={(c) => c.id} emptyText="Belum ada kategori material" />
      </div>

      {/* Modal Create/Edit */}
      <Modal
        open={modalMode !== null}
        onClose={() => setModalMode(null)}
        title={modalMode === 'create' ? 'Tambah Kategori' : `Edit Kategori — ${selected?.name}`}
        width={400}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Menyimpan...' : modalMode === 'create' ? 'Buat Kategori' : 'Simpan'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{
              backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: '8px', padding: '10px 12px',
              color: 'var(--error)', fontSize: '13px',
            }}>{error}</div>
          )}
          <Input
            label="Nama Kategori"
            value={name}
            onChange={setName}
            placeholder="contoh: Aluminium, Kaca, Aksesoris..."
            required
          />
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Kategori yang dihapus tidak bisa dipulihkan jika sudah ada material yang menggunakannya.
          </p>
        </div>
      </Modal>

      {/* Modal Hapus */}
      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Konfirmasi Hapus Kategori"
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
          Kategori <strong style={{ color: 'var(--text-primary)' }}>{deleteModal?.name}</strong> akan dihapus permanen.
          {' '}<strong style={{ color: 'var(--error)' }}>Semua material dengan kategori ini tidak bisa dihapus jika masih ada yang menggunakannya.</strong>
        </p>
      </Modal>
    </div>
  );
}