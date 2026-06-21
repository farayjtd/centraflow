'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from './Button';

type Props = {
  onCapture: (file: File, preview: string) => void;
  onClose: () => void;
};

export function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch {
      setError('Tidak bisa mengakses kamera. Pastikan izin kamera sudah diberikan.');
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
    setCaptured(dataUrl);
    stopCamera();
  };

  const retake = () => {
    setCaptured(null);
    startCamera();
  };

  const confirm = () => {
    if (!captured) return;
    fetch(captured)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file, captured);
        onClose();
      });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      backgroundColor: 'rgba(0,0,0,0.9)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{
        backgroundColor: 'var(--surface)', borderRadius: '16px',
        overflow: 'hidden', width: '100%', maxWidth: '480px',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>
            📷 Selfie Absensi
          </span>
          <Button variant="ghost" size="sm" onClick={() => { stopCamera(); onClose(); }}>✕</Button>
        </div>

        {/* Camera / Preview */}
        <div style={{ position: 'relative', backgroundColor: '#000', aspectRatio: '4/3' }}>
          {error ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: '#fff', fontSize: '14px', padding: '24px', textAlign: 'center',
            }}>
              {error}
            </div>
          ) : captured ? (
            <img src={captured} alt="selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Actions */}
        <div style={{
          padding: '16px 20px', display: 'flex', gap: '10px', justifyContent: 'center',
        }}>
          {!captured && !error && (
            <Button onClick={capture}>📸 Ambil Foto</Button>
          )}
          {captured && (
            <>
              <Button variant="secondary" onClick={retake}>🔄 Ulang</Button>
              <Button onClick={confirm}>✓ Gunakan Foto Ini</Button>
            </>
          )}
          {error && (
            <Button variant="secondary" onClick={() => { stopCamera(); onClose(); }}>Tutup</Button>
          )}
        </div>
      </div>
    </div>
  );
}