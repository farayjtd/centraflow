'use client';

import { useState, useTransition } from 'react';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { createMaterial, updateMaterial, deleteMaterial } from '@/app/actions/materials';
import type { MaterialUnit } from '@/lib/types';

const UNITS: MaterialUnit[] = ['cm', 'm', 'cm2', 'm2', 'Pcs'];

type Category = { id: string; name: string };

type Material = {
  id: string;
  display_id: string;
  material_name: string;
  category_id: string;
  category: Category | null;
  length: number | null;
  width: number | null;
  unit: MaterialUnit;
  created_at: string;
};

type Props = {
  materials: Material[];
  categories: Category[];
};

const emptyForm = {
  material_name: '',
  category_id: '',
  length: '',
  width: '',
  unit: 'Pcs' as MaterialUnit,
};

export function MaterialClient({ materials, categories }: Props) {
  const [isPending, startTransition] = useTransition();
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [deleteModal, setDeleteModal] = useState<Material | null>(null);
  const [selected, setSelected] = useState<Material | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const filtered = materials.filter((m) => {
    const matchSearch =
      m.material_name.toLowerCase().includes(search.toLowerCase()) ||
      m.display_id.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory ? m.category_id === filterCategory : true;
    return matchSearch && matchCategory;
  });

  const openCreate = () => {
    setSelected(null);
    setForm(emptyForm);
    setError('');
    setModalMode('create');
  };

  const openEdit = (m: Material) => {
    setSelected(m);
    setForm({
      material_name: m.material_name,
      category_id: m.category_id,
      length: m.length?.toString() ?? '',
      width: m.width?.toString() ?? '',
      unit: m.unit,
    });
    setError('');
    setModalMode('edit');
  };

  const openDetail = (m: Material) => {
    setSelected(m);
    setModalMode('detail');
  };

  const handleSubmit = () => {
    if (!form.material_name.trim()) return setError('Nama material harus diisi.');
    if (!form.category_id) return setError('Kategori harus dipilih.');
    setError('');

    startTransition(async () => {
      const payload = {
        material_name: form.material_name,
        category_id: form.category_id,
        length: form.length ? parseFloat(form.length) : null,
        width: form.width ? parseFloat(form.width) : null,
        unit: form.unit,
      };

      const result = modalMode === 'create'
        ? await createMaterial(payload)
        : await updateMaterial(selected!.id, payload);

      if (result?.error) setError(result.error);
      else setModalMode(null);
    });
  };

  const confirmDelete = () => {
    if (!deleteModal) return;
    startTransition(async () => {
      await deleteMaterial(deleteModal.id);
      setDeleteModal(null);
    });
  };

  const formatDimension = (m: Material) => {
    if (m.length && m.width) return `${m.length} × ${m.width} ${m.unit}`;
    if (m.length) return `${m.length} ${m.unit}`;
    return m.unit;
  };

  const columns = [
    { key: 'display_id', label: 'ID', width: '100px' },
    {
      key: 'material_name', label: 'Material',
      render: (m: Material) => (
        <div>
          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>
            {m.material_name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {m.category?.name ?? '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'category', label: 'Kategori',
      render: (m: Material) => (
        <Badge label={m.category?.name ?? '-'} variant="default" />
      ),
    },
    {
      key: 'dimension', label: 'Dimensi / Satuan',
      render: (m: Material) => (
        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
          {formatDimension(m)}
        </span>
      ),
    },
    {
      key: 'created_at', label: 'Dibuat',
      render: (m: Material) => new Date(m.created_at).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
      }),
    },
    {
      key: 'actions', label: 'Aksi', width: '180px',
      render: (m: Material) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <Button size="sm" variant="ghost" onClick={() => openDetail(m)}>Detail</Button>
          <Button size="sm" variant="secondary" onClick={() => openEdit(m)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteModal(m)}>Hapus</Button>
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

      <Input
        label="Nama Material"
        value={form.material_name}
        onChange={(v) => setForm({ ...form, material_name: v })}
        placeholder="contoh: Aluminium 4x4, Kaca Tempered..."
        required
      />

      {/* Kategori */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
          Kategori <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <select
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          style={{
            padding: '10px 12px', border: '1px solid var(--border)',
            borderRadius: '8px', fontSize: '14px',
            color: form.category_id ? 'var(--text-primary)' : 'var(--text-secondary)',
            backgroundColor: 'var(--surface)', outline: 'none',
            width: '100%', boxSizing: 'border-box' as const, cursor: 'pointer',
          }}
        >
          <option value="">— Pilih Kategori —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Dimensi */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <Input
            label="Panjang"
            type="number"
            value={form.length}
            onChange={(v) => setForm({ ...form, length: v })}
            placeholder="opsional"
          />
        </div>
        <div style={{ flex: 1 }}>
          <Input
            label="Lebar"
            type="number"
            value={form.width}
            onChange={(v) => setForm({ ...form, width: v })}
            placeholder="opsional"
          />
        </div>
      </div>

      {/* Satuan */}
      <div>
        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
          Satuan <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {UNITS.map((unit) => (
            <label key={unit} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
              border: `1.5px solid ${form.unit === unit ? 'var(--primary)' : 'var(--border)'}`,
              backgroundColor: form.unit === unit ? '#EFF6FF' : 'transparent',
              fontSize: '13px',
              color: form.unit === unit ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: form.unit === unit ? '600' : '400',
              userSelect: 'none' as const,
            }}>
              <input type="radio" checked={form.unit === unit}
                onChange={() => setForm({ ...form, unit })}
                style={{ display: 'none' }} />
              {unit}
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDetail = () => {
    if (!selected) return null;
    const rows = [
      { label: 'ID', value: selected.display_id },
      { label: 'Nama', value: selected.material_name },
      { label: 'Kategori', value: selected.category?.name ?? '-' },
      { label: 'Panjang', value: selected.length ? `${selected.length} ${selected.unit}` : '-' },
      { label: 'Lebar', value: selected.width ? `${selected.width} ${selected.unit}` : '-' },
      { label: 'Satuan', value: selected.unit },
      {
        label: 'Dibuat', value: new Date(selected.created_at).toLocaleDateString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      },
    ];

    return (
      <div>
        {/* Icon */}
        <div style={{
          width: '100%', height: '120px', borderRadius: '10px',
          backgroundColor: '#EFF6FF', marginBottom: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '8px',
        }}>
          <span style={{ fontSize: '40px' }}>📦</span>
          <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {selected.material_name}
          </span>
          <Badge label={selected.category?.name ?? '-'} variant="info" />
        </div>

        {/* Info rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map((row, i) => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0',
              borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', minWidth: '100px' }}>
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
            Material
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {materials.length} material terdaftar
          </p>
        </div>
        <Button onClick={openCreate}>+ Tambah Material</Button>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama material..."
          style={{
            flex: 1, maxWidth: '320px', padding: '10px 12px',
            border: '1px solid var(--border)', borderRadius: '8px',
            fontSize: '14px', color: 'var(--text-primary)',
            backgroundColor: 'var(--surface)', outline: 'none',
            boxSizing: 'border-box' as const,
          }}
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            padding: '10px 12px', border: '1px solid var(--border)',
            borderRadius: '8px', fontSize: '14px',
            color: filterCategory ? 'var(--text-primary)' : 'var(--text-secondary)',
            backgroundColor: 'var(--surface)', outline: 'none',
            cursor: 'pointer', minWidth: '180px',
          }}
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: 'var(--surface)', borderRadius: '12px',
        border: '1px solid var(--border)', overflow: 'hidden',
      }}>
        <Table columns={columns} data={filtered}
          keyExtractor={(m) => m.id} emptyText="Belum ada material" />
      </div>

      {/* Modal Create */}
      <Modal open={modalMode === 'create'} onClose={() => setModalMode(null)}
        title="Tambah Material Baru" width={480}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Menyimpan...' : 'Buat Material'}
            </Button>
          </>
        }>
        {renderForm()}
      </Modal>

      {/* Modal Edit */}
      <Modal open={modalMode === 'edit'} onClose={() => setModalMode(null)}
        title={`Edit Material — ${selected?.material_name}`} width={480}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </>
        }>
        {renderForm()}
      </Modal>

      {/* Modal Detail */}
      <Modal open={modalMode === 'detail'} onClose={() => setModalMode(null)}
        title="Detail Material" width={440}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Tutup</Button>
            <Button onClick={() => { setModalMode(null); openEdit(selected!); }}>Edit Material</Button>
          </>
        }>
        {renderDetail()}
      </Modal>

      {/* Modal Hapus */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)}
        title="Konfirmasi Hapus Material" width={400}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Batal</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isPending}>
              {isPending ? 'Menghapus...' : 'Ya, Hapus Permanen'}
            </Button>
          </>
        }>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Material <strong style={{ color: 'var(--text-primary)' }}>{deleteModal?.material_name}</strong> akan dihapus permanen.
          Tindakan ini <strong style={{ color: 'var(--error)' }}>tidak dapat dibatalkan</strong>.
        </p>
      </Modal>
    </div>
  );
}