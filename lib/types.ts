export type AppRole =
  | 'Admin'
  | 'Owner'
  | 'Teknik_Sipil'
  | 'Kepala_WH'
  | 'Mandor'
  | 'Tukang'
  | 'Sopir';

export type UserProfile = {
  id: string;
  auth_id: string;
  display_id: string;
  full_name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  roles: AppRole[];
};

export type ProjectStatus =
  | 'Panding'
  | 'Check Material'
  | 'Production'
  | 'On-site Installation'
  | 'Completed';

export type TsApprovalStatus = 'Pending' | 'Approved' | 'Rejected';
export type PhotoStatus = 'Pending' | 'Approved' | 'Rejected';
export type MaterialRequestStatus = 'Pending' | 'Diproses' | 'Dikirim' | 'Selesai' | 'Ditolak';
export type DeliveryStatus = 'Persiapan' | 'Berangkat' | 'Dalam Perjalanan' | 'Sampai';
export type TruckType = 'Truk Besar' | 'Engkel' | 'Pick Up';
export type TruckStatus = 'Standby' | 'On Delivery' | 'Maintenance';
export type MaterialUnit = 'cm' | 'm' | 'cm2' | 'm2' | 'Pcs';
export type AttendanceActivity = 'Check-in' | 'Check-out';
export type AttendanceStatus = 'Hadir' | 'Izin' | 'Sakit';