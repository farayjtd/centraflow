'use client';

import { useState, useTransition } from 'react';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  createMaterialRequest,
  updateMaterialRequestStatus,
  deleteMaterialRequest,
} from '@/app/actions/material-requests';
import type { MaterialRequestStatus, UserProfile } from '@/lib/types';

const STATUSES: MaterialRequestStatus[] = ['Pending', 'Diproses', 'Dikirim', 'Selesai', 'Ditolak'];

const statusVariant: Record<MaterialRequestStatus, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  'Pending': 'warning',
  'Diproses': 'info',
  'Dikirim': 'info',
  'Selesai': 'success',
  'Ditolak': 'error',
};

type Project = { id: string; project_name: string; warehouse_id: string | null };
type Material = { id: string; material_name: string; unit: string; category: { name: string } | null };
type Warehouse = { id: string; name: string };

type Request = {
  id: string;
  display_id: string;
  project_id: string;
  material_id: string;
  quantity: number;
  status_wh: MaterialRequestStatus;
  requested_by: string | null;
  created_at: string;
  project: { id: string; project_name: string; warehouse_id: string | null; warehouse: Warehouse | null } | null;
  material: Material | null;
  requester: { id: string; full_name: string } | null;
};

type Props = {
  requests: Request[];
  projects: Project[];
  materials: Material[];
  warehouses: Warehouse[];
  currentUser: UserProfile;
};

const emptyForm = { project_id: '', material_id: '', quantity: '' };

export function MaterialRequestClient({ requests, projects, materials, warehouses, currentUser }: Props) {
  const [isPending, startTransition] = useTransition();
  const [modalMode, setModalMode] = useState<'create' | 'detail' | 'status' | null>(null);
  const [deleteModal, setDeleteModal] = useState<Request | null>(null);
  const [selected, setSelected] = useState<Request | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newStatus, setNewStatus] = useState<MaterialRequestStatus>('Pending');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const isAdmin = currentUser.roles.includes('Admin');
  const isKepalaWH = currentUser.roles.includes('Kepala_WH');
  const isMandor = currentUser.roles.includes('Mandor');
  const canCreate = isAdmin || isKepalaWH || isMandor;
  const canUpdateStatus = isAdmin || isKepalaWH;

  const filtered = requests.filter((r) => {
    const matchSearch =
      r.material?.material_name.toLowerCase().includes(search.toLowerCase()) ||
      r.project?.project_name.toLowerCase().includes(search.toLowerCase()) ||
      r.display_id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus ? r.status_wh === filterStatus : true;
    return matchSearch && matchStatus;
  });

  const openCreate = () => {
    setForm(emptyForm);
    setError('');
    setModalMode('create');
  };

  const openDetail = (r: Request) => {
    setSelected(r);
    setModalMode('detail');
  };

  const openStatus = (r: Request) => {
    setSelected(r);
    setNewStatus(r.status_wh);
    setError('');
    setModalMode('status');
  };

  const handleSubmit = () => {
    if (!form.project_id) return setError('Proyek harus dipilih.');
    if (!form.material_id) return setError('Material harus dipilih.');
    if (!form.quantity || isNaN(parseFloat(form.quantity))) return setError('Jumlah harus diisi.');
    setError('');

    startTransition(async () => {
      const result = await createMaterialRequest({
        project_id: form.project_id,
        material_id: form.material_id,
        quantity: parseFloat(form.quantity),
      });
      if (result?.error) setError(result.error);
      else setModalMode(null);
    });
  };

  const handleUpdateStatus = () => {
    if (!selected) return;
    startTransition(async () => {
      const warehouseId = selected.project?.warehouse_id ?? undefined;
      const result = await updateMaterialRequestStatus(
        selected.id,
        newStatus,
        newStatus === 'Selesai' ? warehouseId : undefined,
        newStatus === 'Selesai' ? selected.material_id : undefined,
        newStatus === 'Selesai' ? selected.quantity : undefined,
      );
      if (result?.error) setError(result.error);
      else setModalMode(null);
    });
  };

  const confirmDelete = () => {
    if (!deleteModal) return;
    startTransition(async () => {
      await deleteMaterialRequest(deleteModal.id);
      setDeleteModal(null);
    });
  };

  const columns = [
    { key: 'display_id', label: 'ID', width: '100px' },
    {
      key: 'material', label: 'Material',
      render: (r: Request) => (
        <div>
          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>
            {r.material?.material_name ?? '-'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {r.material?.category?.name ?? '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'project', label: 'Proyek',
      render: (r: Request) => (
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {r.project?.project_name ?? '-'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {r.project?.warehouse?.name ?? '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'quantity', label: 'Jumlah',
      render: (r: Request) => (
        <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>
          {r.quantity}
        </span>
      ),
    },
    {
      key: 'status_wh', label: 'Status',
      render: (r: Request) => <Badge label={r.status_wh} variant={statusVariant[r.status_wh]} />,
    },
    {
      key: 'requester', label: 'Diminta oleh',
      render: (r: Request) => r.requester?.full_name ?? '-',
    },
    {
      key: 'created_at', label: 'Tanggal',
      render: (r: Request) => new Date(r.created_at).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
      }),
    },
    {
      key: 'actions', label: 'Aksi', width: '200px',
      render: (r: Request) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <Button size="sm" variant="ghost" onClick={() => openDetail(r)}>Detail</Button>
          {canUpdateStatus && r.status_wh !== 'Selesai' && r.status_wh !== 'Ditolak' && (
            <Button size="sm" variant="secondary" onClick={() => openStatus(r)}>Update Status</Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="danger" onClick={() => setDeleteModal(r)}>Hapus</Button>
          )}
        </div>
      ),
    },
  ];

  const renderDetail = () => {
    if (!selected) return null;
    const rows = [
      { label: 'ID', value: selected.display_id },
      { label: 'Material', value: selected.material?.material_name ?? '-' },
      { label: 'Kategori', value: selected.material?.category?.name ?? '-' },
      { label: 'Jumlah', value: `${selected.quantity}` },
      { label: 'Proyek', value: selected.project?.project_name ?? '-' },
      { label: 'Warehouse', value: selected.project?.warehouse?.name ?? '-' },
      { label: 'Diminta oleh', value: selected.requester?.full_name ?? '-' },
      { label: 'Status', value: selected.status_wh },
      {
        label: 'Tanggal', value: new Date(selected.created_at).toLocaleDateString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      },
    ];

    return (
      <div>
        {/* Header */}
        <div style={{
          backgroundColor: '#EFF6FF', borderRadius: '10px',
          padding: '16px', marginBottom: '20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>📋</div>
          <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
            {selected.material?.material_name}
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)', marginBottom: '8px' }}>
            {selected.quantity}
          </div>
          <Badge label={selected.status_wh} variant={statusVariant[selected.status_wh]} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map((row, i) => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0',
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

        {canUpdateStatus && selected.status_wh !== 'Selesai' && selected.status_wh !== 'Ditolak' && (
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => { setModalMode('status'); setNewStatus(selected.status_wh); }}>
              Update Status
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Material Request
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {requests.length} permintaan material
          </p>
        </div>
        {canCreate && <Button onClick={openCreate}>+ Buat Request</Button>}
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari material atau proyek..."
          style={{
            flex: 1, maxWidth: '320px', padding: '10px 12px',
            border: '1px solid var(--border)', borderRadius: '8px',
            fontSize: '14px', color: 'var(--text-primary)',
            backgroundColor: 'var(--surface)', outline: 'none',
            boxSizing: 'border-box' as const,
          }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '10px 12px', border: '1px solid var(--border)',
            borderRadius: '8px', fontSize: '14px',
            color: filterStatus ? 'var(--text-primary)' : 'var(--text-secondary)',
            backgroundColor: 'var(--surface)', outline: 'none',
            cursor: 'pointer', minWidth: '160px',
          }}
        >
          <option value="">Semua Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: 'var(--surface)', borderRadius: '12px',
        border: '1px solid var(--border)', overflow: 'hidden',
      }}>
        <Table columns={columns} data={filtered}
          keyExtractor={(r) => r.id} emptyText="Belum ada material request" />
      </div>

      {/* Modal Create */}
      <Modal open={modalMode === 'create'} onClose={() => setModalMode(null)}
        title="Buat Material Request" width={480}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Menyimpan...' : 'Buat Request'}
            </Button>
          </>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{
              backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: '8px', padding: '10px 12px',
              color: 'var(--error)', fontSize: '13px',
            }}>{error}</div>
          )}

          {/* Proyek */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Proyek <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              style={{
                padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px',
                fontSize: '14px', backgroundColor: 'var(--surface)', outline: 'none',
                color: form.project_id ? 'var(--text-primary)' : 'var(--text-secondary)',
                width: '100%', boxSizing: 'border-box' as const, cursor: 'pointer',
              }}>
              <option value="">— Pilih Proyek —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
          </div>

          {/* Material */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Material <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select value={form.material_id} onChange={(e) => setForm({ ...form, material_id: e.target.value })}
              style={{
                padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px',
                fontSize: '14px', backgroundColor: 'var(--surface)', outline: 'none',
                color: form.material_id ? 'var(--text-primary)' : 'var(--text-secondary)',
                width: '100%', boxSizing: 'border-box' as const, cursor: 'pointer',
              }}>
              <option value="">— Pilih Material —</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.material_name} ({m.category?.name})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Jumlah"
            type="number"
            value={form.quantity}
            onChange={(v) => setForm({ ...form, quantity: v })}
            placeholder="0"
            required
          />

          <div style={{
            backgroundColor: '#FFFBEB', border: '1px solid #FDE68A',
            borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#92400E',
          }}>
            💡 Material Request digunakan saat stok habis dan perlu pembelian dari vendor.
            Saat status berubah ke <strong>Selesai</strong>, stok warehouse akan otomatis bertambah.
          </div>
        </div>
      </Modal>

      {/* Modal Detail */}
      <Modal open={modalMode === 'detail'} onClose={() => setModalMode(null)}
        title="Detail Material Request" width={440}
        footer={
          <Button variant="secondary" onClick={() => setModalMode(null)}>Tutup</Button>
        }>
        {renderDetail()}
      </Modal>

      {/* Modal Update Status */}
      <Modal open={modalMode === 'status'} onClose={() => setModalMode(null)}
        title={`Update Status — ${selected?.material?.material_name}`} width={440}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Batal</Button>
            <Button onClick={handleUpdateStatus} disabled={isPending}>
              {isPending ? 'Menyimpan...' : 'Update Status'}
            </Button>
          </>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{
              backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: '8px', padding: '10px 12px',
              color: 'var(--error)', fontSize: '13px',
            }}>{error}</div>
          )}

          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Request: <strong style={{ color: 'var(--text-primary)' }}>{selected?.material?.material_name}</strong> — {selected?.quantity} unit
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Status Baru</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {STATUSES.filter((s) => s !== 'Pending').map((s) => (
                <label key={s} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                  border: `1.5px solid ${newStatus === s ? 'var(--primary)' : 'var(--border)'}`,
                  backgroundColor: newStatus === s ? '#EFF6FF' : 'transparent',
                }}>
                  <input type="radio" name="status" checked={newStatus === s}
                    onChange={() => setNewStatus(s)} style={{ display: 'none' }} />
                  <Badge label={s} variant={statusVariant[s]} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {s === 'Diproses' && '— Sudah order ke vendor'}
                    {s === 'Dikirim' && '— Vendor sedang kirim barang'}
                    {s === 'Selesai' && '— Barang sudah diterima, stok otomatis bertambah'}
                    {s === 'Ditolak' && '— Request dibatalkan/ditolak'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {newStatus === 'Selesai' && (
            <div style={{
              backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0',
              borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#166534',
            }}>
              ✅ Stok <strong>{selected?.material?.material_name}</strong> di warehouse <strong>{selected?.project?.warehouse?.name}</strong> akan
              otomatis bertambah <strong>{selected?.quantity}</strong> saat disimpan.
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Hapus */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)}
        title="Konfirmasi Hapus Request" width={400}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Batal</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isPending}>
              {isPending ? 'Menghapus...' : 'Ya, Hapus'}
            </Button>
          </>
        }>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Material Request <strong style={{ color: 'var(--text-primary)' }}>
            {deleteModal?.material?.material_name}
          </strong> akan dihapus permanen.
        </p>
      </Modal>
    </div>
  );
}