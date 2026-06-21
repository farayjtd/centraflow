'use client';

import { useState, useTransition } from 'react';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { CameraCapture } from '@/components/ui/CameraCapture';
import { createAttendance, deleteAttendance } from '@/app/actions/attendances';
import type { AttendanceActivity, AttendanceStatus, UserProfile } from '@/lib/types';

const ACTIVITIES: AttendanceActivity[] = ['Check-in', 'Check-out'];
const STATUSES: AttendanceStatus[] = ['Hadir', 'Izin', 'Sakit'];

const statusVariant: Record<AttendanceStatus, 'success' | 'warning' | 'error'> = {
  'Hadir': 'success',
  'Izin': 'warning',
  'Sakit': 'error',
};

const activityVariant: Record<AttendanceActivity, 'success' | 'info'> = {
  'Check-in': 'success',
  'Check-out': 'info',
};

type User = { id: string; full_name: string; avatar_url: string | null };
type Project = { id: string; project_name: string };

type Attendance = {
  id: string;
  display_id: string;
  user_id: string;
  project_id: string | null;
  activity_type: AttendanceActivity;
  timestamp: string;
  status: AttendanceStatus;
  selfie_photo_url: string | null;
  notes: string | null;
  created_at: string;
  user: User | null;
  project: Project | null;
};

type Props = {
  attendances: Attendance[];
  users: User[];
  projects: Project[];
  currentUser: UserProfile;
};

const emptyForm = {
  user_id: '',
  project_id: '',
  activity_type: 'Check-in' as AttendanceActivity,
  status: 'Hadir' as AttendanceStatus,
  notes: '',
};

export function AbsensiClient({ attendances, users, projects, currentUser }: Props) {
  const [isPending, startTransition] = useTransition();
  const [modalMode, setModalMode] = useState<'create' | 'detail' | null>(null);
  const [deleteModal, setDeleteModal] = useState<Attendance | null>(null);
  const [selected, setSelected] = useState<Attendance | null>(null);
  const [form, setForm] = useState({ ...emptyForm, user_id: currentUser.id });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const isAdmin = currentUser.roles.includes('Admin');
  const isOwner = currentUser.roles.includes('Owner');
  const canSeeAll = isAdmin || isOwner;
  const canInputForOthers = isAdmin;

  const filtered = attendances.filter((a) => {
    const matchSearch =
      a.user?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.project?.project_name.toLowerCase().includes(search.toLowerCase()) ||
      a.display_id.toLowerCase().includes(search.toLowerCase());
    const matchDate = filterDate
      ? a.timestamp.startsWith(filterDate)
      : true;
    const matchActivity = filterActivity ? a.activity_type === filterActivity : true;
    return matchSearch && matchDate && matchActivity;
  });

  const openCreate = () => {
    setForm({ ...emptyForm, user_id: currentUser.id });
    setSelfieFile(null);
    setSelfiePreview(null);
    setError('');
    setModalMode('create');
  };

  const openDetail = (a: Attendance) => {
    setSelected(a);
    setModalMode('detail');
  };

  const handleCapture = (file: File, preview: string) => {
    setSelfieFile(file);
    setSelfiePreview(preview);
  };

  const handleSubmit = () => {
    if (!form.user_id) return setError('User harus dipilih.');
    if (form.activity_type === 'Check-in' && !selfieFile) {
      return setError('Selfie wajib saat Check-in.');
    }
    setError('');

    startTransition(async () => {
      try {
        let selfieUrl: string | undefined;

        if (selfieFile) {
          setUploadingSelfie(true);
          const fd = new FormData();
          fd.append('file', selfieFile);
          const res = await fetch('/api/upload-selfie', { method: 'POST', body: fd });
          const result = await res.json();
          setUploadingSelfie(false);

          if (result.error) return setError(result.error);
          selfieUrl = result.url;
        }

        const result = await createAttendance({
          user_id: form.user_id,
          project_id: form.project_id || undefined,
          activity_type: form.activity_type,
          status: form.status,
          selfie_photo_url: selfieUrl,
          notes: form.notes || undefined,
        });

        if (result?.error) setError(result.error);
        else setModalMode(null);
      } catch {
        setError('Terjadi kesalahan.');
        setUploadingSelfie(false);
      }
    });
  };

  const confirmDelete = () => {
    if (!deleteModal) return;
    startTransition(async () => {
      await deleteAttendance(deleteModal.id);
      setDeleteModal(null);
    });
  };

  const RadioGroup = ({ label, options, value, onChange }: {
    label: string; options: string[]; value: string; onChange: (v: string) => void;
  }) => (
    <div>
      <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
        {label}
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {options.map((opt) => (
          <label key={opt} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
            border: `1.5px solid ${value === opt ? 'var(--primary)' : 'var(--border)'}`,
            backgroundColor: value === opt ? '#EFF6FF' : 'transparent',
            fontSize: '13px',
            color: value === opt ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: value === opt ? '600' : '400',
            userSelect: 'none' as const,
          }}>
            <input type="radio" checked={value === opt}
              onChange={() => onChange(opt)} style={{ display: 'none' }} />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );

  const columns = [
    { key: 'display_id', label: 'ID', width: '100px' },
    {
      key: 'user', label: 'User',
      render: (a: Attendance) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            backgroundColor: 'var(--primary)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}>
            {a.user?.avatar_url
              ? <img src={a.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>
                  {a.user?.full_name.charAt(0)}
                </span>
            }
          </div>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {a.user?.full_name ?? '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'activity_type', label: 'Aktivitas',
      render: (a: Attendance) => <Badge label={a.activity_type} variant={activityVariant[a.activity_type]} />,
    },
    {
      key: 'status', label: 'Status',
      render: (a: Attendance) => <Badge label={a.status} variant={statusVariant[a.status]} />,
    },
    {
      key: 'project', label: 'Proyek',
      render: (a: Attendance) => a.project?.project_name ?? '-',
    },
    {
      key: 'timestamp', label: 'Waktu',
      render: (a: Attendance) => new Date(a.timestamp).toLocaleString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
    },
    {
      key: 'selfie', label: 'Selfie',
      render: (a: Attendance) => a.selfie_photo_url ? (
        <img
          src={a.selfie_photo_url}
          alt="selfie"
          onClick={() => setLightbox(a.selfie_photo_url)}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            objectFit: 'cover', cursor: 'pointer',
            border: '2px solid var(--border)',
          }}
        />
      ) : <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>—</span>,
    },
    {
      key: 'actions', label: 'Aksi', width: '120px',
      render: (a: Attendance) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <Button size="sm" variant="ghost" onClick={() => openDetail(a)}>Detail</Button>
          {isAdmin && (
            <Button size="sm" variant="danger" onClick={() => setDeleteModal(a)}>Hapus</Button>
          )}
        </div>
      ),
    },
  ];

  const renderDetail = () => {
    if (!selected) return null;
    const rows = [
      { label: 'ID', value: selected.display_id },
      { label: 'User', value: selected.user?.full_name ?? '-' },
      { label: 'Aktivitas', value: selected.activity_type },
      { label: 'Status', value: selected.status },
      { label: 'Proyek', value: selected.project?.project_name ?? '-' },
      { label: 'Catatan', value: selected.notes ?? '-' },
      {
        label: 'Waktu', value: new Date(selected.timestamp).toLocaleString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      },
    ];

    return (
      <div>
        {/* Selfie */}
        {selected.selfie_photo_url && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <img
              src={selected.selfie_photo_url}
              alt="selfie"
              onClick={() => setLightbox(selected.selfie_photo_url)}
              style={{
                width: '120px', height: '120px', borderRadius: '50%',
                objectFit: 'cover', cursor: 'pointer',
                border: '3px solid var(--primary)',
              }}
            />
          </div>
        )}

        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
          <Badge label={selected.activity_type} variant={activityVariant[selected.activity_type]} />
          <Badge label={selected.status} variant={statusVariant[selected.status]} />
        </div>

        {/* Info rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map((row, i) => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0',
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
      {/* Camera overlay */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }} />
          <button onClick={() => setLightbox(null)} style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'rgba(255,255,255,0.2)', border: 'none',
            color: '#fff', fontSize: '20px', width: '40px', height: '40px',
            borderRadius: '50%', cursor: 'pointer',
          }}>✕</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Absensi
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {attendances.length} record absensi
          </p>
        </div>
        <Button onClick={openCreate}>+ Absen Sekarang</Button>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau proyek..."
          style={{
            flex: 1, minWidth: '200px', maxWidth: '280px', padding: '10px 12px',
            border: '1px solid var(--border)', borderRadius: '8px',
            fontSize: '14px', color: 'var(--text-primary)',
            backgroundColor: 'var(--surface)', outline: 'none',
            boxSizing: 'border-box' as const,
          }}
        />
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={{
            padding: '10px 12px', border: '1px solid var(--border)',
            borderRadius: '8px', fontSize: '14px',
            color: filterDate ? 'var(--text-primary)' : 'var(--text-secondary)',
            backgroundColor: 'var(--surface)', outline: 'none', cursor: 'pointer',
          }}
        />
        <select
          value={filterActivity}
          onChange={(e) => setFilterActivity(e.target.value)}
          style={{
            padding: '10px 12px', border: '1px solid var(--border)',
            borderRadius: '8px', fontSize: '14px',
            color: filterActivity ? 'var(--text-primary)' : 'var(--text-secondary)',
            backgroundColor: 'var(--surface)', outline: 'none',
            cursor: 'pointer', minWidth: '140px',
          }}
        >
          <option value="">Semua Aktivitas</option>
          {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: 'var(--surface)', borderRadius: '12px',
        border: '1px solid var(--border)', overflow: 'hidden',
      }}>
        <Table columns={columns} data={filtered}
          keyExtractor={(a) => a.id} emptyText="Belum ada data absensi" />
      </div>

      {/* Modal Create */}
      <Modal open={modalMode === 'create'} onClose={() => setModalMode(null)}
        title="Absen Sekarang" width={480}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending || uploadingSelfie}>
              {isPending || uploadingSelfie ? 'Memproses...' : 'Simpan Absensi'}
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

          {/* User — Admin bisa pilih siapa saja */}
          {canInputForOthers ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                User <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                style={{
                  padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px',
                  fontSize: '14px', backgroundColor: 'var(--surface)', outline: 'none',
                  color: form.user_id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  width: '100%', boxSizing: 'border-box' as const, cursor: 'pointer',
                }}>
                <option value="">— Pilih User —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
          ) : (
            <div style={{
              padding: '10px 12px', border: '1px solid var(--border)',
              borderRadius: '8px', fontSize: '14px', color: 'var(--text-secondary)',
              backgroundColor: '#F8FAFC',
            }}>
              {currentUser.full_name}
            </div>
          )}

          {/* Proyek */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Proyek (opsional)
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

          <RadioGroup label="Aktivitas" options={ACTIVITIES} value={form.activity_type}
            onChange={(v) => setForm({ ...form, activity_type: v as AttendanceActivity })} />

          <RadioGroup label="Status" options={STATUSES} value={form.status}
            onChange={(v) => setForm({ ...form, status: v as AttendanceStatus })} />

          {/* Selfie */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Selfie {form.activity_type === 'Check-in' && <span style={{ color: 'var(--error)' }}>*</span>}
              {form.activity_type === 'Check-out' && <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}> (opsional)</span>}
            </label>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {selfiePreview ? (
                <img src={selfiePreview} alt="selfie"
                  style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
              ) : (
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  backgroundColor: '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', flexShrink: 0,
                }}>📷</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Button size="sm" variant="secondary" onClick={() => setShowCamera(true)}>
                  {selfiePreview ? '🔄 Ambil Ulang' : '📷 Buka Kamera'}
                </Button>
                {selfiePreview && (
                  <button type="button" onClick={() => { setSelfieFile(null); setSelfiePreview(null); }}
                    style={{ fontSize: '12px', color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    Hapus selfie
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Catatan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Catatan (opsional)
            </label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Tambahkan catatan..."
              style={{
                padding: '10px 12px', border: '1px solid var(--border)',
                borderRadius: '8px', fontSize: '14px', color: 'var(--text-primary)',
                backgroundColor: 'var(--surface)', outline: 'none',
                boxSizing: 'border-box' as const, width: '100%',
              }} />
          </div>

          {/* Timestamp info */}
          <div style={{
            backgroundColor: '#EFF6FF', borderRadius: '8px', padding: '10px 12px',
            fontSize: '13px', color: 'var(--primary)',
          }}>
            🕐 Waktu absensi: <strong>{new Date().toLocaleString('id-ID', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}</strong>
          </div>
        </div>
      </Modal>

      {/* Modal Detail */}
      <Modal open={modalMode === 'detail'} onClose={() => setModalMode(null)}
        title="Detail Absensi" width={440}
        footer={<Button variant="secondary" onClick={() => setModalMode(null)}>Tutup</Button>}>
        {renderDetail()}
      </Modal>

      {/* Modal Hapus */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)}
        title="Konfirmasi Hapus Absensi" width={400}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Batal</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isPending}>
              {isPending ? 'Menghapus...' : 'Ya, Hapus'}
            </Button>
          </>
        }>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Data absensi <strong style={{ color: 'var(--text-primary)' }}>{deleteModal?.user?.full_name}</strong> pada{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {deleteModal && new Date(deleteModal.timestamp).toLocaleDateString('id-ID')}
          </strong> akan dihapus permanen.
        </p>
      </Modal>
    </div>
  );
}