'use client';

import { useState, useTransition, useRef } from 'react';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  createProject, updateProject, deleteProject,
  addBOQItem, updateBOQItem, deleteBOQItem,
} from '@/app/actions/projects';
import { createClient } from '@/lib/supabase/client';
import type { ProjectStatus, UserProfile } from '@/lib/types';

const PROJECT_STATUSES: ProjectStatus[] = [
  'Panding', 'Check Material', 'Production', 'On-site Installation', 'Completed',
];

const statusVariant: Record<ProjectStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  'Panding': 'default',
  'Check Material': 'warning',
  'Production': 'info',
  'On-site Installation': 'info',
  'Completed': 'success',
};

const approvalVariant: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  'Pending': 'warning',
  'Approved': 'success',
  'Rejected': 'error',
};

type Warehouse = { id: string; name: string };
type Material = { id: string; material_name: string; unit: string; category: { name: string } | null };

type BOQItem = {
  id: string;
  display_id: string;
  project_id: string;
  material_id: string;
  quantity_required: number;
  material: Material | null;
  stock_status?: 'Cukup' | 'Kurang' | 'Kosong';
  current_stock?: number;
};

// BOQ item yang belum disimpan (hanya ada di state saat create)
type PendingBOQItem = {
  tempId: string;
  material_id: string;
  quantity_required: number;
  material: Material | null;
};

type Project = {
  id: string;
  display_id: string;
  project_name: string;
  client_name: string;
  client_address: string | null;
  client_phone: string | null;
  start_date: string | null;
  end_target: string | null;
  boq_file_url: string | null;
  status: ProjectStatus;
  ts_approval: string;
  warehouse_id: string | null;
  warehouse: Warehouse | null;
  creator: { id: string; full_name: string } | null;
  created_at: string;
};

type Props = {
  projects: Project[];
  warehouses: Warehouse[];
  materials: Material[];
  currentUser: UserProfile;
};

const emptyForm = {
  project_name: '', client_name: '', client_address: '',
  client_phone: '', start_date: '', end_target: '',
  warehouse_id: '', status: 'Panding' as ProjectStatus,
  boq_file_url: '',
};

const emptyBOQForm = { material_id: '', quantity_required: '' };

export function ProyekClient({ projects, warehouses, materials, currentUser }: Props) {
  const [isPending, startTransition] = useTransition();
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [deleteModal, setDeleteModal] = useState<Project | null>(null);
  const [selected, setSelected] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [boqFile, setBoqFile] = useState<File | null>(null);
  const [uploadingBoq, setUploadingBoq] = useState(false);
  const boqFileRef = useRef<HTMLInputElement>(null);

  // BOQ state untuk detail/edit existing project
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [loadingBOQ, setLoadingBOQ] = useState(false);
  const [boqForm, setBOQForm] = useState(emptyBOQForm);
  const [boqError, setBOQError] = useState('');
  const [editBOQ, setEditBOQ] = useState<BOQItem | null>(null);

  // Pending BOQ items untuk form create (belum ada project_id)
  const [pendingBOQ, setPendingBOQ] = useState<PendingBOQItem[]>([]);
  const [pendingBOQForm, setPendingBOQForm] = useState(emptyBOQForm);
  const [pendingBOQError, setPendingBOQError] = useState('');

  const isAdmin = currentUser.roles.includes('Admin');
  const isTeknikSipil = currentUser.roles.includes('Teknik_Sipil');
  const canEdit = isAdmin || isTeknikSipil;

  const filtered = projects.filter((p) => {
    const matchSearch =
      p.project_name.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name.toLowerCase().includes(search.toLowerCase()) ||
      p.display_id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus ? p.status === filterStatus : true;
    return matchSearch && matchStatus;
  });

  const supabase = createClient();

  const fetchBOQ = async (projectId: string) => {
    setLoadingBOQ(true);
    setBoqItems([]);
    try {
      const { data: boqData } = await supabase
        .from('project_materials')
        .select('*, material:material_id(id, material_name, unit, category:category_id(name))')
        .eq('project_id', projectId)
        .order('created_at');

      const { data: stockStatus } = await supabase
        .from('v_project_materials_status')
        .select('*')
        .eq('project_id', projectId);

      const merged = (boqData ?? []).map((item: any) => {
        const ss = stockStatus?.find((s: any) => s.project_material_id === item.id);
        return { ...item, stock_status: ss?.stock_status, current_stock: ss?.current_stock };
      });

      setBoqItems(merged);
    } finally {
      setLoadingBOQ(false);
    }
  };

  const openCreate = () => {
    setSelected(null);
    setForm(emptyForm);
    setBoqFile(null);
    setPendingBOQ([]);
    setPendingBOQForm(emptyBOQForm);
    setPendingBOQError('');
    setError('');
    setModalMode('create');
  };

  const openEdit = (p: Project) => {
    setSelected(p);
    setForm({
      project_name: p.project_name,
      client_name: p.client_name,
      client_address: p.client_address ?? '',
      client_phone: p.client_phone ?? '',
      start_date: p.start_date ?? '',
      end_target: p.end_target ?? '',
      warehouse_id: p.warehouse_id ?? '',
      status: p.status,
      boq_file_url: p.boq_file_url ?? '',
    });
    setBoqFile(null);
    setError('');
    setModalMode('edit');
  };

  const openDetail = (p: Project) => {
    setSelected(p);
    setBOQForm(emptyBOQForm);
    setBOQError('');
    setEditBOQ(null);
    fetchBOQ(p.id);
    setModalMode('detail');
  };

  const uploadBoqFile = async (file: File): Promise<string | null> => {
    setUploadingBoq(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload-boq', { method: 'POST', body: fd });
      const result = await res.json();
      if (result.error) { setError(result.error); return null; }
      return result.url;
    } catch {
      setError('Gagal upload file BOQ.');
      return null;
    } finally {
      setUploadingBoq(false);
    }
  };

  // Tambah item BOQ ke pending list (saat create)
  const handleAddPendingBOQ = () => {
    if (!pendingBOQForm.material_id) return setPendingBOQError('Material harus dipilih.');
    if (!pendingBOQForm.quantity_required || isNaN(parseFloat(pendingBOQForm.quantity_required))) {
      return setPendingBOQError('Jumlah harus diisi.');
    }
    const mat = materials.find((m) => m.id === pendingBOQForm.material_id);
    const already = pendingBOQ.find((p) => p.material_id === pendingBOQForm.material_id);
    if (already) return setPendingBOQError('Material ini sudah ada di daftar BOQ.');
    setPendingBOQError('');
    setPendingBOQ((prev) => [...prev, {
      tempId: Date.now().toString(),
      material_id: pendingBOQForm.material_id,
      quantity_required: parseFloat(pendingBOQForm.quantity_required),
      material: mat ?? null,
    }]);
    setPendingBOQForm(emptyBOQForm);
  };

  const handleSubmit = () => {
    if (!form.project_name.trim()) return setError('Nama proyek harus diisi.');
    if (!form.client_name.trim()) return setError('Nama klien harus diisi.');
    setError('');

    startTransition(async () => {
      try {
        let boqUrl = form.boq_file_url || undefined;
        if (boqFile) {
          const uploaded = await uploadBoqFile(boqFile);
          if (!uploaded) return;
          boqUrl = uploaded;
        }

        const payload = {
          project_name: form.project_name,
          client_name: form.client_name,
          client_address: form.client_address,
          client_phone: form.client_phone,
          start_date: form.start_date || '',
          end_target: form.end_target || '',
          warehouse_id: form.warehouse_id || '',
          boq_file_url: boqUrl,
        };

        if (modalMode === 'create') {
          const result = await createProject(payload);
          if (result?.error) return setError(result.error);

          // Insert semua pending BOQ items
          if (result.id && pendingBOQ.length > 0) {
            for (const item of pendingBOQ) {
              await addBOQItem(result.id, item.material_id, item.quantity_required);
            }
          }
        } else {
          const result = await updateProject(selected!.id, { ...payload, status: form.status });
          if (result?.error) return setError(result.error);
        }

        setModalMode(null);
      } catch {
        setError('Terjadi kesalahan.');
      }
    });
  };

  // BOQ actions untuk detail modal
  const handleAddBOQ = () => {
    if (!boqForm.material_id) return setBOQError('Material harus dipilih.');
    if (!boqForm.quantity_required || isNaN(parseFloat(boqForm.quantity_required))) {
      return setBOQError('Jumlah harus diisi.');
    }
    setBOQError('');

    startTransition(async () => {
      let result;
      if (editBOQ) {
        result = await updateBOQItem(editBOQ.id, parseFloat(boqForm.quantity_required));
      } else {
        result = await addBOQItem(selected!.id, boqForm.material_id, parseFloat(boqForm.quantity_required));
      }
      if (result?.error) {
        setBOQError(result.error);
      } else {
        setBOQForm(emptyBOQForm);
        setEditBOQ(null);
        fetchBOQ(selected!.id);
      }
    });
  };

  const handleDeleteBOQ = (id: string) => {
    startTransition(async () => {
      await deleteBOQItem(id);
      fetchBOQ(selected!.id);
    });
  };

  const confirmDelete = () => {
    if (!deleteModal) return;
    startTransition(async () => {
      await deleteProject(deleteModal.id);
      setDeleteModal(null);
    });
  };

  const stockBadge = (status?: string) => {
    if (status === 'Cukup') return <Badge label="Cukup" variant="success" />;
    if (status === 'Kurang') return <Badge label="Kurang" variant="warning" />;
    if (status === 'Kosong') return <Badge label="Kosong" variant="error" />;
    return <Badge label="—" variant="default" />;
  };

  const columns = [
    { key: 'display_id', label: 'ID', width: '90px' },
    {
      key: 'project_name', label: 'Proyek',
      render: (p: Project) => (
        <div>
          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>{p.project_name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.client_name}</div>
        </div>
      ),
    },
    { key: 'warehouse', label: 'Warehouse', render: (p: Project) => p.warehouse?.name ?? '-' },
    {
      key: 'status', label: 'Status',
      render: (p: Project) => <Badge label={p.status} variant={statusVariant[p.status]} />,
    },
    {
      key: 'ts_approval', label: 'Approval TS',
      render: (p: Project) => <Badge label={p.ts_approval} variant={approvalVariant[p.ts_approval] ?? 'default'} />,
    },
    {
      key: 'end_target', label: 'Target Selesai',
      render: (p: Project) => p.end_target
        ? new Date(p.end_target).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        : '-',
    },
    {
      key: 'actions', label: 'Aksi', width: '190px',
      render: (p: Project) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <Button size="sm" variant="ghost" onClick={() => openDetail(p)}>Detail & BOQ</Button>
          {canEdit && <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>Edit</Button>}
          {isAdmin && <Button size="sm" variant="danger" onClick={() => setDeleteModal(p)}>Hapus</Button>}
        </div>
      ),
    },
  ];

  // Komponen form proyek (dipakai di create dan edit)
  const renderProjectFields = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <Input label="Nama Proyek" value={form.project_name}
            onChange={(v) => setForm({ ...form, project_name: v })} required />
        </div>
        <div style={{ flex: 1 }}>
          <Input label="Nama Klien" value={form.client_name}
            onChange={(v) => setForm({ ...form, client_name: v })} required />
        </div>
      </div>

      <Input label="Alamat Klien" value={form.client_address}
        onChange={(v) => setForm({ ...form, client_address: v })} placeholder="Alamat lengkap..." />

      <Input label="No. HP Klien" value={form.client_phone}
        onChange={(v) => setForm({ ...form, client_phone: v })} placeholder="08xx..." />

      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <Input label="Tanggal Mulai" type="date" value={form.start_date}
            onChange={(v) => setForm({ ...form, start_date: v })} />
        </div>
        <div style={{ flex: 1 }}>
          <Input label="Target Selesai" type="date" value={form.end_target}
            onChange={(v) => setForm({ ...form, end_target: v })} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Warehouse</label>
        <select value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
          style={{
            padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px',
            fontSize: '14px', color: form.warehouse_id ? 'var(--text-primary)' : 'var(--text-secondary)',
            backgroundColor: 'var(--surface)', outline: 'none',
            width: '100%', boxSizing: 'border-box' as const, cursor: 'pointer',
          }}>
          <option value="">— Pilih Warehouse —</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {modalMode === 'edit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
            style={{
              padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px',
              fontSize: '14px', color: 'var(--text-primary)',
              backgroundColor: 'var(--surface)', outline: 'none',
              width: '100%', boxSizing: 'border-box' as const, cursor: 'pointer',
            }}>
            {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
          File BOQ (PDF/Excel) — opsional
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button type="button" onClick={() => boqFileRef.current?.click()}
            style={{
              padding: '8px 16px', border: '1px solid var(--border)',
              borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
              backgroundColor: 'var(--surface)', color: 'var(--text-primary)',
            }}>
            📎 Pilih File
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {boqFile ? boqFile.name : form.boq_file_url ? '✅ File sudah ada' : 'Belum ada file'}
          </span>
        </div>
        <input ref={boqFileRef} type="file" accept=".pdf,.xlsx,.xls"
          style={{ display: 'none' }} onChange={(e) => setBoqFile(e.target.files?.[0] ?? null)} />
        {form.boq_file_url && !boqFile && (
          <a href={form.boq_file_url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '12px', color: 'var(--primary)' }}>
            📄 Lihat file BOQ yang ada
          </a>
        )}
      </div>
    </div>
  );

  // BOQ inline untuk form create
  const renderPendingBOQ = () => (
    <div style={{ marginTop: '8px' }}>
      <div style={{
        borderTop: '1px solid var(--border)', paddingTop: '20px',
        fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '12px',
      }}>
        Bill of Quantity (BOQ) — opsional
      </div>

      {pendingBOQError && (
        <div style={{
          backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: '6px', padding: '8px 10px',
          color: 'var(--error)', fontSize: '12px', marginBottom: '10px',
        }}>{pendingBOQError}</div>
      )}

      {/* Input tambah item */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '12px' }}>
        <div style={{ flex: 2 }}>
          <select
            value={pendingBOQForm.material_id}
            onChange={(e) => setPendingBOQForm({ ...pendingBOQForm, material_id: e.target.value })}
            style={{
              width: '100%', padding: '10px 12px',
              border: '1px solid var(--border)', borderRadius: '8px',
              fontSize: '14px', backgroundColor: 'var(--surface)',
              color: pendingBOQForm.material_id ? 'var(--text-primary)' : 'var(--text-secondary)',
              outline: 'none', cursor: 'pointer', boxSizing: 'border-box' as const,
            }}>
            <option value="">— Pilih Material —</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.material_name} ({m.category?.name})
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <Input
            label=""
            type="number"
            value={pendingBOQForm.quantity_required}
            onChange={(v) => setPendingBOQForm({ ...pendingBOQForm, quantity_required: v })}
            placeholder="Jumlah"
          />
        </div>
        <Button size="sm" onClick={handleAddPendingBOQ}>+ Tambah</Button>
      </div>

      {/* Daftar pending BOQ */}
      {pendingBOQ.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                {['Material', 'Kategori', 'Jumlah', ''].map((h) => (
                  <th key={h} style={{
                    padding: '8px 12px', textAlign: 'left',
                    fontWeight: '600', color: 'var(--text-secondary)',
                    fontSize: '11px', textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingBOQ.map((item, i) => (
                <tr key={item.tempId} style={{
                  borderBottom: i < pendingBOQ.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <td style={{ padding: '8px 12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {item.material?.material_name ?? '-'}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                    {item.material?.category?.name ?? '-'}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: '700' }}>
                    {item.quantity_required}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <button
                      type="button"
                      onClick={() => setPendingBOQ((prev) => prev.filter((p) => p.tempId !== item.tempId))}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--error)', fontSize: '13px', fontWeight: '600',
                      }}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pendingBOQ.length === 0 && (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px 0' }}>
          Belum ada item BOQ — bisa ditambahkan setelah proyek dibuat juga
        </p>
      )}
    </div>
  );

  const renderDetail = () => {
    if (!selected) return null;

    return (
      <div>
        {/* Info proyek */}
        <div style={{
          backgroundColor: '#EFF6FF', borderRadius: '10px',
          padding: '16px', marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)' }}>
                {selected.project_name}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {selected.display_id} · {selected.client_name}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Badge label={selected.status} variant={statusVariant[selected.status]} />
              <Badge label={`TS: ${selected.ts_approval}`} variant={approvalVariant[selected.ts_approval] ?? 'default'} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {[
              { label: 'Warehouse', value: selected.warehouse?.name ?? '-' },
              { label: 'Mulai', value: selected.start_date ? new Date(selected.start_date).toLocaleDateString('id-ID') : '-' },
              { label: 'Target', value: selected.end_target ? new Date(selected.end_target).toLocaleDateString('id-ID') : '-' },
              { label: 'HP Klien', value: selected.client_phone ?? '-' },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.value}</div>
              </div>
            ))}
          </div>
          {selected.boq_file_url && (
            <a href={selected.boq_file_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: '10px', fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}>
              📄 Download File BOQ
            </a>
          )}
        </div>

        {/* BOQ Section */}
        <div>
          <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '12px' }}>
            Bill of Quantity (BOQ)
          </div>

          {canEdit && (
            <div style={{
              backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '14px',
              marginBottom: '16px', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '10px' }}>
                {editBOQ ? `Edit Item: ${editBOQ.material?.material_name}` : '+ Tambah Item BOQ'}
              </div>
              {boqError && (
                <div style={{
                  backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
                  borderRadius: '6px', padding: '8px 10px',
                  color: 'var(--error)', fontSize: '12px', marginBottom: '10px',
                }}>{boqError}</div>
              )}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: 2 }}>
                  {editBOQ ? (
                    <div style={{
                      padding: '10px 12px', border: '1px solid var(--border)',
                      borderRadius: '8px', fontSize: '14px', color: 'var(--text-secondary)',
                      backgroundColor: '#F0F0F0',
                    }}>
                      {editBOQ.material?.material_name}
                    </div>
                  ) : (
                    <select
                      value={boqForm.material_id}
                      onChange={(e) => setBOQForm({ ...boqForm, material_id: e.target.value })}
                      style={{
                        width: '100%', padding: '10px 12px',
                        border: '1px solid var(--border)', borderRadius: '8px',
                        fontSize: '14px', backgroundColor: 'var(--surface)',
                        color: boqForm.material_id ? 'var(--text-primary)' : 'var(--text-secondary)',
                        outline: 'none', cursor: 'pointer', boxSizing: 'border-box' as const,
                      }}>
                      <option value="">— Pilih Material —</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.material_name} ({m.category?.name})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <Input label="" type="number" value={boqForm.quantity_required}
                    onChange={(v) => setBOQForm({ ...boqForm, quantity_required: v })}
                    placeholder="Jumlah" />
                </div>
                <Button onClick={handleAddBOQ} disabled={isPending} size="sm">
                  {isPending ? '...' : editBOQ ? 'Simpan' : 'Tambah'}
                </Button>
                {editBOQ && (
                  <Button variant="ghost" size="sm" onClick={() => { setEditBOQ(null); setBOQForm(emptyBOQForm); }}>
                    Batal
                  </Button>
                )}
              </div>
            </div>
          )}

          {loadingBOQ ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Memuat data BOQ...
            </div>
          ) : boqItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Belum ada item BOQ
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                    {['ID', 'Material', 'Kategori', 'Qty', 'Stok', 'Status Stok', canEdit ? 'Aksi' : ''].filter(Boolean).map((h) => (
                      <th key={h} style={{
                        padding: '10px 12px', textAlign: 'left',
                        fontWeight: '600', color: 'var(--text-secondary)',
                        fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {boqItems.map((item, i) => (
                    <tr key={item.id} style={{
                      borderBottom: i < boqItems.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {item.display_id}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {item.material?.material_name ?? '-'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                        {item.material?.category?.name ?? '-'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {item.quantity_required}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                        {item.current_stock ?? '-'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {stockBadge(item.stock_status)}
                      </td>
                      {canEdit && (
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <Button size="sm" variant="secondary" onClick={() => {
                              setEditBOQ(item);
                              setBOQForm({ material_id: item.material_id, quantity_required: item.quantity_required.toString() });
                            }}>Edit</Button>
                            <Button size="sm" variant="danger" onClick={() => handleDeleteBOQ(item.id)}>Hapus</Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
            Proyek
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {projects.length} proyek terdaftar
          </p>
        </div>
        {canEdit && <Button onClick={openCreate}>+ Tambah Proyek</Button>}
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama proyek atau klien..."
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
            cursor: 'pointer', minWidth: '180px',
          }}
        >
          <option value="">Semua Status</option>
          {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: 'var(--surface)', borderRadius: '12px',
        border: '1px solid var(--border)', overflow: 'hidden',
      }}>
        <Table columns={columns} data={filtered}
          keyExtractor={(p) => p.id} emptyText="Belum ada proyek" />
      </div>

      {/* Modal Create */}
      <Modal open={modalMode === 'create'} onClose={() => setModalMode(null)}
        title="Tambah Proyek Baru" width={640}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending || uploadingBoq}>
              {isPending ? 'Menyimpan...' : `Buat Proyek${pendingBOQ.length > 0 ? ` + ${pendingBOQ.length} Item BOQ` : ''}`}
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
          {renderProjectFields()}
          {renderPendingBOQ()}
        </div>
      </Modal>

      {/* Modal Edit */}
      <Modal open={modalMode === 'edit'} onClose={() => setModalMode(null)}
        title={`Edit Proyek — ${selected?.project_name}`} width={600}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending || uploadingBoq}>
              {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
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
          {renderProjectFields()}
        </div>
      </Modal>

      {/* Modal Detail + BOQ */}
      <Modal open={modalMode === 'detail'} onClose={() => setModalMode(null)}
        title="Detail Proyek & BOQ" width={720}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Tutup</Button>
            {canEdit && (
              <Button onClick={() => { setModalMode(null); openEdit(selected!); }}>Edit Proyek</Button>
            )}
          </>
        }>
        {renderDetail()}
      </Modal>

      {/* Modal Hapus */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)}
        title="Konfirmasi Hapus Proyek" width={400}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Batal</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isPending}>
              {isPending ? 'Menghapus...' : 'Ya, Hapus Permanen'}
            </Button>
          </>
        }>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Proyek <strong style={{ color: 'var(--text-primary)' }}>{deleteModal?.project_name}</strong> dan
          seluruh data terkait akan dihapus permanen.
          Tindakan ini <strong style={{ color: 'var(--error)' }}>tidak dapat dibatalkan</strong>.
        </p>
      </Modal>
    </div>
  );
}