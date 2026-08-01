import React, { useRef, useState } from 'react';
import { resetUserPassword } from '../../services/passwordService';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface AdminResetPasswordModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess?: (result: { email: string; expiresAt: string; notificationSent: boolean }) => void;
}

const AdminResetPasswordModal: React.FC<AdminResetPasswordModalProps> = ({
  isOpen,
  user,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  if (!isOpen || !user) return null;

  const submit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError('');
    try {
      const response = await resetUserPassword(user.id);
      if (!response.success || !response.data?.notificationSent) {
        setError(response.error || 'No fue posible enviar la contraseña temporal');
        return;
      }
      onSuccess?.(response.data);
      onClose();
    } catch (cause: any) {
      setError(cause?.message || 'No fue posible enviar la contraseña temporal');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 id="reset-password-title" className="text-xl font-bold text-gray-950">Restablecer contraseña</h2>
        <dl className="mt-5 grid gap-2 rounded-lg bg-gray-50 p-4 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-gray-600">Usuario</dt><dd className="font-semibold text-gray-950">{user.firstName} {user.lastName}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-gray-600">Correo</dt><dd className="break-all font-medium text-gray-950">{user.email}</dd></div>
        </dl>
        <p className="mt-5 text-sm leading-6 text-gray-700">
          Se cerrarán sus sesiones y recibirá por correo una contraseña temporal válida por 24 horas. Deberá cambiarla en su próximo ingreso.
        </p>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={loading} className="min-h-11 rounded-lg border border-gray-300 px-4 font-semibold text-gray-700 disabled:opacity-50">Cancelar</button>
          <button type="button" onClick={submit} disabled={loading} className="min-h-11 rounded-lg bg-amber-500 px-4 font-bold text-white hover:bg-amber-600 disabled:cursor-wait disabled:opacity-60">
            {loading ? 'Generando y enviando…' : 'Generar y enviar contraseña'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminResetPasswordModal;
export { AdminResetPasswordModal };
