// components/Notification.tsx
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

/**
 * @interface NotificationProps
 * @description Props yang dibutuhkan untuk komponen Notification
 * @property {string} message - Pesan yang akan ditampilkan
 * @property {'success' | 'info' | 'error'} type - Tipe notifikasi yang menentukan warna dan ikon
 */
interface NotificationProps {
  message: string;
  type: 'success' | 'info' | 'error';
}

/**
 * @component Notification
 * @description Komponen untuk menampilkan pesan notifikasi dengan warna dan ikon yang sesuai
 * @param {NotificationProps} props - Props yang dibutuhkan oleh komponen
 * @returns {JSX.Element} Komponen notifikasi dengan ikon dan pesan
 */
export default function Notification({ message, type }: NotificationProps) {
  let bgColor = 'bg-blue-500/10';
  let textColor = 'text-blue-400';
  let borderColor = 'border-blue-500/20';
  let Icon = Info;

  if (type === 'success') {
    bgColor = 'bg-green-500/10';
    textColor = 'text-green-400';
    borderColor = 'border-green-500/20';
    Icon = CheckCircle;
  } else if (type === 'error') {
    bgColor = 'bg-red-500/10';
    textColor = 'text-red-400';
    borderColor = 'border-red-500/20';
    Icon = AlertCircle;
  }

  return (
    <div className={`mb-6 p-4 rounded-xl flex items-center gap-2 ${bgColor} ${textColor} border ${borderColor}`}>
      <Icon className="w-5 h-5" />
      {message}
    </div>
  );
}
