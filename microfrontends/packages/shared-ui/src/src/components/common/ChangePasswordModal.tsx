/**
 * Change Password Modal Component
 *
 * Self-service password change for all users
 * Requires current password validation
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  changePassword,
  validatePassword,
  passwordsMatch,
  getErrorMessage,
  evaluatePasswordStrength,
  PasswordStrength
} from '../../services/passwordService';
import { authStore } from '../../../../../backend-sdk/src/auth/store';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Subcomponentes UI                                                          */
/* -------------------------------------------------------------------------- */

type FieldId = 'currentPassword' | 'newPassword' | 'confirmPassword';

interface PasswordFieldProps {
  id: FieldId;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  disabled?: boolean;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
  state?: 'default' | 'success' | 'error';
}

const EyeIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    {open ? (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </>
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    )}
  </svg>
);

const LockIcon: React.FC = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.104 0 2 .896 2 2v3a2 2 0 11-4 0v-3c0-1.104.896-2 2-2zm6-3V7a6 6 0 10-12 0v1H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2h-1zM8 7a4 4 0 118 0v1H8V7z" />
  </svg>
);

const PasswordField: React.FC<PasswordFieldProps> = ({
  id, label, value, onChange, show, onToggleShow,
  disabled, placeholder, autoComplete, hint, state = 'default'
}) => {
  const ringColor =
    state === 'error' ? 'border-red-300 focus-within:ring-red-400 focus-within:border-red-400' :
    state === 'success' ? 'border-emerald-300 focus-within:ring-emerald-400 focus-within:border-emerald-400' :
    'border-gray-200 focus-within:ring-blue-400 focus-within:border-blue-400';

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div
        className={`flex items-center gap-2 w-full pl-3 pr-2 py-0.5 bg-white border rounded-xl transition-all duration-150 focus-within:ring-2 ${ringColor} ${disabled ? 'bg-gray-50' : ''}`}
      >
        <span className="text-gray-400 shrink-0">
          <LockIcon />
        </span>
        <input
          type={show ? 'text' : 'password'}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="flex-1 py-2 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400 disabled:text-gray-500"
        />
        <button
          type="button"
          onClick={onToggleShow}
          disabled={disabled}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <EyeIcon open={show} />
        </button>
      </div>
      {hint && (
        <p className={`mt-1.5 text-xs flex items-center gap-1 ${
          state === 'error' ? 'text-red-600' :
          state === 'success' ? 'text-emerald-600' :
          'text-gray-500'
        }`}>
          {state === 'success' && (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          {state === 'error' && (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {hint}
        </p>
      )}
    </div>
  );
};

/* -- Indicador de fortaleza segmentado (4 segmentos) ---------------------- */

interface StrengthMeterProps {
  password: string;
  strength: PasswordStrength;
}

const StrengthMeter: React.FC<StrengthMeterProps> = ({ password, strength }) => {
  // Mapeo de nivel -> # segmentos activos y color
  const levels = ['weak', 'fair', 'good', 'strong'] as const;
  const activeIndex = levels.indexOf(strength.level as typeof levels[number]);

  const palette = {
    weak:   { bar: 'bg-red-500',     text: 'text-red-600',     ring: 'bg-red-50',     label: 'Débil' },
    fair:   { bar: 'bg-orange-500',  text: 'text-orange-600',  ring: 'bg-orange-50',  label: 'Regular' },
    good:   { bar: 'bg-yellow-500',  text: 'text-yellow-700',  ring: 'bg-yellow-50',  label: 'Buena' },
    strong: { bar: 'bg-emerald-500', text: 'text-emerald-700', ring: 'bg-emerald-50', label: 'Muy segura' },
  } as const;

  const current = palette[(strength.level as keyof typeof palette) || 'weak'];

  const requirements: Array<{ key: string; label: string; ok: boolean }> = [
    { key: 'len',  label: 'Al menos 6 caracteres', ok: password.length >= 6 },
    { key: 'upp',  label: 'Una letra mayúscula',    ok: /[A-Z]/.test(password) },
    { key: 'low',  label: 'Una letra minúscula',    ok: /[a-z]/.test(password) },
    { key: 'num',  label: 'Un número',              ok: /[0-9]/.test(password) },
    { key: 'spec', label: 'Un carácter especial',   ok: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <div className="mt-3 space-y-3">
      {/* Header con etiqueta */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Nivel de seguridad</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${current.ring} ${current.text}`}>
          {current.label}
        </span>
      </div>

      {/* Barra segmentada */}
      <div className="flex gap-1.5" role="progressbar" aria-valuenow={activeIndex + 1} aria-valuemin={0} aria-valuemax={4} aria-label="Fortaleza de la contraseña">
        {levels.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= activeIndex ? current.bar : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Checklist de requisitos */}
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
        {requirements.map((r) => (
          <li
            key={r.key}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              r.ok ? 'text-emerald-600' : 'text-gray-500'
            }`}
          >
            <span
              className={`inline-flex items-center justify-center w-4 h-4 rounded-full transition-all duration-200 ${
                r.ok ? 'bg-emerald-100' : 'bg-gray-100'
              }`}
              aria-hidden="true"
            >
              {r.ok ? (
                <svg className="w-2.5 h-2.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="w-1 h-1 rounded-full bg-gray-400" />
              )}
            </span>
            <span>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Modal principal                                                            */
/* -------------------------------------------------------------------------- */

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  // Obtener email del usuario del authStore (fuente de verdad)
  useEffect(() => {
    if (isOpen) {
      const state = authStore.getState();
      const email = state.user?.email;

      console.log('[ChangePasswordModal] Email from authStore:', email);

      if (email) {
        setUserEmail(email);
      } else {
        console.warn('[ChangePasswordModal] No email in authStore, trying localStorage...');
        const possibleKeys = [
          'admitia_auth_user',
          'admitia_current_professor',
          'authenticated_user',
          'currentProfessor',
          'professor_user',
          'authenticated_user__development',
          'authenticated_user__staging',
          'authenticated_user__production',
          'currentProfessor__development',
          'currentProfessor__staging',
          'currentProfessor__production',
        ];

        for (const key of possibleKeys) {
          try {
            const userData = localStorage.getItem(key);
            if (userData) {
              const parsed = JSON.parse(userData);
              if (parsed.email) {
                console.log('[ChangePasswordModal] Found email in localStorage:', key, parsed.email);
                setUserEmail(parsed.email);
                return;
              }
            }
          } catch {
            // ignore
          }
        }

        console.error('[ChangePasswordModal] Could not find user email anywhere');
      }
    }
  }, [isOpen]);

  // Evaluar fortaleza de la contraseña en tiempo real
  const passwordStrength = useMemo(() => evaluatePasswordStrength(newPassword), [newPassword]);

  // Estado de coincidencia entre nueva y confirmación (en vivo)
  const confirmState: 'default' | 'success' | 'error' = useMemo(() => {
    if (!confirmPassword) return 'default';
    return confirmPassword === newPassword ? 'success' : 'error';
  }, [confirmPassword, newPassword]);

  const confirmHint =
    confirmState === 'success' ? 'Las contraseñas coinciden' :
    confirmState === 'error'   ? 'Las contraseñas no coinciden' :
    undefined;

  // Habilita el botón solo si todo es válido (mejora la UX)
  const canSubmit =
    !loading && !success &&
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    confirmPassword === newPassword &&
    currentPassword !== newPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!currentPassword) {
      setError('La contraseña actual es requerida');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (!passwordsMatch(newPassword, confirmPassword)) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    if (currentPassword === newPassword) {
      setError('La nueva contraseña debe ser diferente a la actual');
      return;
    }

    setLoading(true);

    try {
      const response = await changePassword({
        currentPassword,
        newPassword,
        email: userEmail || undefined
      });

      if (response.success) {
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

        setTimeout(() => {
          onSuccess?.();
          onClose();
          setSuccess(false);
        }, 1800);
      } else {
        setError(response.errorCode ? getErrorMessage(response.errorCode) : response.error || 'Error al cambiar la contraseña');
      }
    } catch (err: any) {
      setError('Error de conexión. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600">
                <LockIcon />
              </div>
              <div>
                <h2 id="change-password-title" className="text-lg font-semibold text-gray-900">
                  Cambiar contraseña
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Mantén tu cuenta protegida usando una contraseña segura
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              aria-label="Cerrar"
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-emerald-800">¡Contraseña actualizada!</p>
                <p className="text-xs text-emerald-700 mt-0.5">Cerrando ventana…</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !success && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Current Password */}
            <PasswordField
              id="currentPassword"
              label="Contraseña actual"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrentPassword}
              onToggleShow={() => setShowCurrentPassword(!showCurrentPassword)}
              disabled={loading || success}
              placeholder="Ingresa tu contraseña actual"
              autoComplete="current-password"
            />

            {/* New Password */}
            <div>
              <PasswordField
                id="newPassword"
                label="Nueva contraseña"
                value={newPassword}
                onChange={setNewPassword}
                show={showNewPassword}
                onToggleShow={() => setShowNewPassword(!showNewPassword)}
                disabled={loading || success}
                placeholder="Crea una contraseña segura"
                autoComplete="new-password"
              />
              {newPassword && (
                <StrengthMeter password={newPassword} strength={passwordStrength} />
              )}
            </div>

            {/* Confirm Password */}
            <PasswordField
              id="confirmPassword"
              label="Confirmar nueva contraseña"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirmPassword}
              onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading || success}
              placeholder="Repite la nueva contraseña"
              autoComplete="new-password"
              state={confirmState}
              hint={confirmHint}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading || success}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cambiando…
              </span>
            ) : (
              'Cambiar contraseña'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
