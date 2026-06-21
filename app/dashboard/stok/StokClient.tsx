'use client';

import { useState, useTransition } from 'react';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { createStock, updateStock, deleteStock } from '@/app/actions/stocks';

type Material = {
  id: string;
  material_name: string;
  unit: string;
  category: { name: string } | null;
};

type Warehouse = { id: string; name: string };

type Stock = {
  id: string;
  display_id: string;
  material_id: string;
  warehouse_id: string;
  current_stock: number;
  reserved_stock: number;
  reserved_project_id: string | null;
  updated_date: string | null;
  created_at: string;
  material: Material | null;
  warehouse: Warehouse | null;
};

type Props = {
  stocks: Stock[];
  materials: Material[];
  warehouses: Warehouse[];
};

const emptyForm = {
  material_id: '',
  warehouse_id: '',
  current_stock: '',
};

export function StokClient({ stocks, materials, warehouses }: Props) {
  const [isPending, startTransition] = useTransition();
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [deleteModal, setDeleteModal] = useState<Stock | null>(null);
  const [selected, setSelected] = useState<Stock | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');

  const filtered = stocks.filter((s) => {
    const matchSearch =
      s.material?.material_name.toLowerCase().includes(search.toLowerCase()) ||
      s.warehouse?.name.toLowerCase().includes(search.toLowerCase()) ||
      s.display_id.toLowerCase().includes(search.toLowerCase());
    const matchWarehouse = filterWarehouse ? s.warehouse_id === filterWarehouse : true;
    return matchSearch && matchWarehouse;
  });

  const openCreate = () => {
    setSelected(null);
    setForm(emptyForm);
    setError('');
    setModalMode('create');
  };

  const openEdit = (s: Stock) => {
    setSelected(s);
    setForm({
      material_id: s.material_id,
      warehouse_id: s.warehouse_id,
      current_stock: s.current_stock.toString(),
    });
    setError('');
    setModalMode('edit');
  };

  const openDetail = (s: Stock) => {
    setSelected(s);
    setModalMode('detail');
  };

  const handleSubmit = () => {
    if (modalMode === 'create') {
      if (!form.material_id) return setError('Material harus dipilih.');
      if (!form.warehouse_id) return setError('Warehouse harus dipilih.');
    }
    if (!form.current_stock || isNaN(parseFloat(form.current_stock))) {
      return setError('Jumlah stok harus diisi dengan angka.');
    }
    setError('');

    startTransition(async () => {
      let result;
      if (modalMode === 'create') {
        result = await createStock({
          material_id: form.material_id,
          warehouse_id: form.warehouse_id,
          current_stock: parseFloat(form.current_stock),
        });
      } else {
        result = await updateStock(selected!.id, parseFloat(form.current_stock));
      }

      if (result?.error) setError(result.error);
      else setModalMode(null);
    });
  };

  const confirmDelete = () => {
    if (!deleteModal) return;
    startTransition(async () => {
      await deleteStock(deleteModal.id);
      setDeleteModal(null);
    });
  };

  const getStockStatus = (s: Stock) => {
    if (s.current_stock <= 0) return { label: 'Habis', variant: 'error' as const };
    if (s.reserved_stock > 0 && s.current_stock <= s.reserved_stock) return { label: 'Kritis', variant: 'warning' as const };
    return { label: 'Tersedia', variant: 'success' as const };
  };

  const columns = [
    { key: 'display_id', label: 'ID', width: '100px' },
    {
      key: 'material', label: 'Material',
      render: (s: Stock) => (
        <div>
          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>
            {s.material?.material_name ?? '-'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {s.material?.category?.name ?? '-'} · {s.material?.unit}
          </div>
        </div>
      ),
    },
    {
      key: 'warehouse', label: 'Warehouse',
      render: (s: Stock) => (
        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
          {s.warehouse?.name ?? '-'}
        </span>
      ),
    },
    {
      key: 'current_stock', label: 'Stok',
      render: (s: Stock) => (
        <div>
          <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>
            {s.current_stock}
          </div>
          {s.reserved_stock > 0 && (
            <div style={{ fontSize: '11px', color: '#D97706' }}>
              Reserved: {s.reserved_stock}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: (s: Stock) => {
        const st = getStockStatus(s);
        return <Badge label={st.label} variant={st.variant} />;
      },
    },
    {
      key: 'updated_date', label: 'Update Terakhir',
      render: (s: Stock) => s.updated_date
        ? new Date(s.updated_date).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric',
          })
        : '-',
    },
    {
      key: 'actions', label: 'Aksi', width: '180px',
      render: (s: Stock) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <Button size="sm" variant="ghost" onClick={() => openDetail(s)}>Detail</Button>
          <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>Edit Stok</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteModal(s)}>Hapus</Button>
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

      {/* Material */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
          Material {modalMode === 'create' && <span style={{ color: 'var(--error)' }}>*</span>}
        </label>
        {modalMode === 'edit' ? (
          <div style={{
            padding: '10px 12px', border: '1px solid var(--border)',
            borderRadius: '8px', fontSize: '14px',
            color: 'var(--text-secondary)', backgroundColor: '#F8FAFC',
          }}>
            {selected?.material?.material_name} ({selected?.material?.unit})
          </div>
        ) : (
          <select
            value={form.material_id}
            onChange={(e) => setForm({ ...form, material_id: e.target.value })}
            style={{
              padding: '10px 12px', border: '1px solid var(--border)',
              borderRadius: '8px', fontSize: '14px',
              color: form.material_id ? 'var(--text-primary)' : 'var(--text-secondary)',
              backgroundColor: 'var(--surface)', outline: 'none',
              width: '100%', boxSizing: 'border-box' as const, cursor: 'pointer',
            }}
          >
            <option value="">— Pilih Material —</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.material_name} ({m.unit})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Warehouse */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
          Warehouse {modalMode === 'create' && <span style={{ color: 'var(--error)' }}>*</span>}
        </label>
        {modalMode === 'edit' ? (
          <div style={{
            padding: '10px 12px', border: '1px solid var(--border)',
            borderRadius: '8px', fontSize: '14px',
            color: 'var(--text-secondary)', backgroundColor: '#F8FAFC',
          }}>
            {selected?.warehouse?.name}
          </div>
        ) : (
          <select
            value={form.warehouse_id}
            onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
            style={{
              padding: '10px 12px', border: '1px solid var(--border)',
              borderRadius: '8px', fontSize: '14px',
              color: form.warehouse_id ? 'var(--text-primary)' : 'var(--text-secondary)',
              backgroundColor: 'var(--surface)', outline: 'none',
              width: '100%', boxSizing: 'border-box' as const, cursor: 'pointer',
            }}
          >
            <option value="">— Pilih Warehouse —</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        )}
      </div>

      <Input
        label="Jumlah Stok"
        type="number"
        value={form.current_stock}
        onChange={(v) => setForm({ ...form, current_stock: v })}
        placeholder="0"
        required
      />

      {modalMode === 'edit' && selected && selected.reserved_stock > 0 && (
        <div style={{
          backgroundColor: '#FFFBEB', border: '1px solid #FDE68A',
          borderRadius: '8px', padding: '10px 12px',
          fontSize: '13px', color: '#92400E',
        }}>
          ⚠️ Stok ini memiliki <strong>{selected.reserved_stock}</strong> yang
          sedang direserved untuk proyek terkait. Reserved stock tidak bisa diubah manual.
        </div>
      )}
    </div>
  );

  const renderDetail = () => {
    if (!selected) return null;
    const st = getStockStatus(selected);
    const stokEfektif = selected.current_stock - selected.reserved_stock;

    const rows = [
      { label: 'ID', value: selected.display_id },
      { label: 'Material', value: selected.material?.material_name ?? '-' },
      { label: 'Kategori', value: selected.material?.category?.name ?? '-' },
      { label: 'Satuan', value: selected.material?.unit ?? '-' },
      { label: 'Warehouse', value: selected.warehouse?.name ?? '-' },
      { label: 'Stok Tersedia', value: `${selected.current_stock}` },
      { label: 'Stok Reserved', value: `${selected.reserved_stock}` },
      { label: 'Stok Efektif', value: `${stokEfektif}` },
      { label: 'Reserved untuk', value: selected.reserved_project_id ? 'Ada proyek terkait' : '-' },
      {
        label: 'Update Terakhir', value: selected.updated_date
          ? new Date(selected.updated_date).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'long', year: 'numeric',
            })
          : '-',
      },
    ];

    return (
      <div>
        {/* Header card */}
        <div style={{
          backgroundColor: '#EFF6FF', borderRadius: '10px',
          padding: '20px', marginBottom: '20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>📦</div>
          <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>
            {selected.material?.material_name}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            {selected.warehouse?.name}
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary)', marginBottom: '4px' }}>
            {selected.current_stock}
          </div>
          <Badge label={st.label} variant={st.variant} />
        </div>

        {/* Info rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map((row, i) => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0',
              borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', minWidth: '130px' }}>
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
            Stok Material
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {stocks.length} entri stok
          </p>
        </div>
        <Button onClick={openCreate}>+ Tambah Stok</Button>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari material atau warehouse..."
          style={{
            flex: 1, maxWidth: '320px', padding: '10px 12px',
            border: '1px solid var(--border)', borderRadius: '8px',
            fontSize: '14px', color: 'var(--text-primary)',
            backgroundColor: 'var(--surface)', outline: 'none',
            boxSizing: 'border-box' as const,
          }}
        />
        <select
          value={filterWarehouse}
          onChange={(e) => setFilterWarehouse(e.target.value)}
          style={{
            padding: '10px 12px', border: '1px solid var(--border)',
            borderRadius: '8px', fontSize: '14px',
            color: filterWarehouse ? 'var(--text-primary)' : 'var(--text-secondary)',
            backgroundColor: 'var(--surface)', outline: 'none',
            cursor: 'pointer', minWidth: '180px',
          }}
        >
          <option value="">Semua Warehouse</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: 'var(--surface)', borderRadius: '12px',
        border: '1px solid var(--border)', overflow: 'hidden',
      }}>
        <Table columns={columns} data={filtered}
          keyExtractor={(s) => s.id} emptyText="Belum ada data stok" />
      </div>

      {/* Modal Create */}
      <Modal open={modalMode === 'create'} onClose={() => setModalMode(null)}
        title="Tambah Stok Material" width={480}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Menyimpan...' : 'Simpan Stok'}
            </Button>
          </>
        }>
        {renderForm()}
      </Modal>

      {/* Modal Edit */}
      <Modal open={modalMode === 'edit'} onClose={() => setModalMode(null)}
        title={`Update Stok — ${selected?.material?.material_name}`} width={480}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Menyimpan...' : 'Update Stok'}
            </Button>
          </>
        }>
        {renderForm()}
      </Modal>

      {/* Modal Detail */}
      <Modal open={modalMode === 'detail'} onClose={() => setModalMode(null)}
        title="Detail Stok" width={460}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Tutup</Button>
            <Button onClick={() => { setModalMode(null); openEdit(selected!); }}>Update Stok</Button>
          </>
        }>
        {renderDetail()}
      </Modal>

      {/* Modal Hapus */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)}
        title="Konfirmasi Hapus Stok" width={400}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Batal</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isPending}>
              {isPending ? 'Menghapus...' : 'Ya, Hapus'}
            </Button>
          </>
        }>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Data stok <strong style={{ color: 'var(--text-primary)' }}>
            {deleteModal?.material?.material_name}
          </strong> di warehouse <strong style={{ color: 'var(--text-primary)' }}>
            {deleteModal?.warehouse?.name}
          </strong> akan dihapus permanen.
        </p>
      </Modal>
    </div>
  );
}