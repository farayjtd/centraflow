'use client';

import { useState, useTransition, useRef, lazy, Suspense } from 'react';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { createWarehouse, updateWarehouse, deleteWarehouse } from '@/app/actions/warehouses';

const MapPicker = lazy(() =>
  import('@/components/ui/MapPicker').then((m) => ({ default: m.MapPicker }))
);

type Warehouse = {
  id: string;
  display_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  created_at: string;
};

type Props = { warehouses: Warehouse[] };

const emptyForm = {
  name: '', address: '', lat: null as number | null,
  lng: null as number | null, photo_url: '',
};

export function WarehousesClient({ warehouses }: Props) {
  const [isPending, startTransition] = useTransition();
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [deleteModal, setDeleteModal] = useState<Warehouse | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = warehouses.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.address?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setSelectedWarehouse(null);
    setForm(emptyForm);
    setPhotoPreview(null);
    setPhotoFile(null);
    setError('');
    setModalMode('create');
  };

  const openEdit = (w: Warehouse) => {
    setSelectedWarehouse(w);
    setForm({
      name: w.name,
      address: w.address ?? '',
      lat: w.lat,
      lng: w.lng,
      photo_url: w.photo_url ?? '',
    });
    setPhotoPreview(w.photo_url);
    setPhotoFile(null);
    setError('');
    setModalMode('edit');
  };

  const openDetail = (w: Warehouse) => {
    setSelectedWarehouse(w);
    setModalMode('detail');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload-warehouse-photo', { method: 'POST', body: fd });
      const result = await res.json();
      if (result.error) { setError(result.error); return null; }
      return result.url;
    } catch {
      setError('Gagal upload foto.');
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return setError('Nama gudang harus diisi.');
    setError('');

    startTransition(async () => {
      try {
        let photoUrl = form.photo_url || undefined;
        if (photoFile) {
          const uploaded = await uploadPhoto(photoFile);
          if (!uploaded) return;
          photoUrl = uploaded;
        }

        const payload = {
          name: form.name,
          address: form.address,
          lat: form.lat,
          lng: form.lng,
          photo_url: photoUrl,
        };

        const result = modalMode === 'create'
          ? await createWarehouse(payload)
          : await updateWarehouse(selectedWarehouse!.id, payload);

        if (result?.error) setError(result.error);
        else setModalMode(null);
      } catch {
        setError('Terjadi kesalahan.');
      }
    });
  };

  const confirmDelete = () => {
    if (!deleteModal) return;
    startTransition(async () => {
      await deleteWarehouse(deleteModal.id);
      setDeleteModal(null);
    });
  };

  const columns = [
    { key: 'display_id', label: 'ID', width: '90px' },
    {
      key: 'name', label: 'Gudang',
      render: (w: Warehouse) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '8px',
            backgroundColor: '#EFF6FF', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {w.photo_url ? (
              <img src={w.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '20px' }}>🏭</span>
            )}
          </div>
          <div>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>{w.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{w.address ?? '-'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'location', label: 'Koordinat',
      render: (w: Warehouse) => w.lat && w.lng
        ? <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{w.lat.toFixed(4)}, {w.lng.toFixed(4)}</span>
        : <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Belum diset</span>,
    },
    {
      key: 'created_at', label: 'Dibuat',
      render: (w: Warehouse) => new Date(w.created_at).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
      }),
    },
    {
      key: 'actions', label: 'Aksi', width: '180px',
      render: (w: Warehouse) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <Button size="sm" variant="ghost" onClick={() => openDetail(w)}>Detail</Button>
          <Button size="sm" variant="secondary" onClick={() => openEdit(w)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteModal(w)}>Hapus</Button>
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

      {/* Photo Upload */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
          Foto Gudang
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%', height: '140px', borderRadius: '8px',
            border: '2px dashed var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', overflow: 'hidden',
            backgroundColor: '#F8FAFC',
            position: 'relative',
          }}
        >
          {photoPreview ? (
            <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '6px' }}>🏭</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Klik untuk upload foto</div>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*"
          style={{ display: 'none' }} onChange={handlePhotoChange} />
        {photoPreview && (
          <button type="button" onClick={() => { setPhotoPreview(null); setPhotoFile(null); setForm({ ...form, photo_url: '' }); }}
            style={{ fontSize: '12px', color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            Hapus foto
          </button>
        )}
      </div>

      <Input label="Nama Gudang" value={form.name}
        onChange={(v) => setForm({ ...form, name: v })} required />
      <Input label="Alamat" value={form.address}
        onChange={(v) => setForm({ ...form, address: v })} placeholder="Jl. ..." />

      {/* Map Picker */}
      <Suspense fallback={
        <div style={{ height: '300px', backgroundColor: '#F8FAFC', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Memuat peta...
        </div>
      }>
        <MapPicker
          lat={form.lat}
          lng={form.lng}
          onChange={(lat, lng) => setForm({ ...form, lat, lng })}
        />
      </Suspense>
    </div>
  );

  const renderDetail = () => {
    if (!selectedWarehouse) return null;
    const rows = [
      { label: 'ID', value: selectedWarehouse.display_id },
      { label: 'Nama', value: selectedWarehouse.name },
      { label: 'Alamat', value: selectedWarehouse.address ?? '-' },
      { label: 'Latitude', value: selectedWarehouse.lat?.toFixed(6) ?? '-' },
      { label: 'Longitude', value: selectedWarehouse.lng?.toFixed(6) ?? '-' },
      {
        label: 'Dibuat', value: new Date(selectedWarehouse.created_at).toLocaleDateString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      },
    ];

    return (
      <div>
        {/* Photo */}
        <div style={{
          width: '100%', height: '160px', borderRadius: '10px',
          backgroundColor: '#EFF6FF', marginBottom: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {selectedWarehouse.photo_url ? (
            <img src={selectedWarehouse.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '48px' }}>🏭</span>
          )}
        </div>

        {/* Mini map */}
        {selectedWarehouse.lat && selectedWarehouse.lng && (
          <div style={{ marginBottom: '20px' }}>
            <Suspense fallback={<div style={{ height: '200px', backgroundColor: '#F8FAFC', borderRadius: '8px' }} />}>
              <MapPicker
                lat={selectedWarehouse.lat}
                lng={selectedWarehouse.lng}
                onChange={() => {}}
                height={200}
              />
            </Suspense>
          </div>
        )}

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
            Manajemen Gudang
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {warehouses.length} gudang terdaftar
          </p>
        </div>
        <Button onClick={openCreate}>+ Tambah Gudang</Button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '16px', maxWidth: '320px' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau alamat gudang..."
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
        <Table columns={columns} data={filtered}
          keyExtractor={(w) => w.id} emptyText="Belum ada gudang" />
      </div>

      {/* Modal Create */}
      <Modal open={modalMode === 'create'} onClose={() => setModalMode(null)}
        title="Tambah Gudang Baru" width={560}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending || uploadingPhoto}>
              {isPending ? 'Menyimpan...' : 'Buat Gudang'}
            </Button>
          </>
        }>
        {renderForm()}
      </Modal>

      {/* Modal Edit */}
      <Modal open={modalMode === 'edit'} onClose={() => setModalMode(null)}
        title={`Edit Gudang — ${selectedWarehouse?.name}`} width={560}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending || uploadingPhoto}>
              {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </>
        }>
        {renderForm()}
      </Modal>

      {/* Modal Detail */}
      <Modal open={modalMode === 'detail'} onClose={() => setModalMode(null)}
        title="Detail Gudang" width={500}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Tutup</Button>
            <Button onClick={() => { setModalMode(null); openEdit(selectedWarehouse!); }}>Edit Gudang</Button>
          </>
        }>
        {renderDetail()}
      </Modal>

      {/* Modal Hapus */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)}
        title="Konfirmasi Hapus Gudang" width={400}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Batal</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isPending}>
              {isPending ? 'Menghapus...' : 'Ya, Hapus Permanen'}
            </Button>
          </>
        }>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Gudang <strong style={{ color: 'var(--text-primary)' }}>{deleteModal?.name}</strong> akan dihapus permanen
          beserta seluruh data terkait. Tindakan ini <strong style={{ color: 'var(--error)' }}>tidak dapat dibatalkan</strong>.
        </p>
      </Modal>
    </div>
  );
}