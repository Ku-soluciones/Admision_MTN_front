import type { FormEvent, PropsWithChildren } from 'react';
import { useMemo, useState } from 'react';
import { authStore, useAuthStore } from '../../../../backend-sdk/src/auth/store';
import { getApiBaseUrl } from '../../config/api.config';
import { CheckCircleIcon, ShieldCheckIcon } from '../icons/Icons';

const passwordRules = [
  { label: '8 caracteres como mínimo', test: (value: string) => value.length >= 8 },
  { label: 'Una letra mayúscula', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'Una letra minúscula', test: (value: string) => /[a-z]/.test(value) },
  { label: 'Un número', test: (value: string) => /[0-9]/.test(value) },
];

export default function TemporaryPasswordGate({ children }: PropsWithChildren) {
  const user = useAuthStore((state) => state.user);
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const mustChange = Boolean(user?.mustChangePassword);
  const expired = Boolean(user?.temporaryPasswordExpired)
    || (Boolean(user?.temporaryPasswordExpiresAt)
      && new Date(String(user?.temporaryPasswordExpiresAt)).getTime() <= Date.now());
  const rules = useMemo(
    () => passwordRules.map((rule) => ({ ...rule, passed: rule.test(newPassword) })),
    [newPassword],
  );
  const strength = rules.filter((rule) => rule.passed).length;
  const valid = strength === passwordRules.length && newPassword === confirmation && !expired;

  if (!mustChange) return <>{children}</>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const token = authStore.getValidAccessToken();
      const response = await fetch(`${getApiBaseUrl()}/v1/auth/change-temporary-password`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ newPassword }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error?.message || body?.message || 'No fue posible actualizar la contraseña');
      }

      const updatedUser = body?.data?.user;
      if (updatedUser?.active === false) {
        throw new Error('La contraseña se actualizó, pero la cuenta figura inactiva. Contacta al administrador.');
      }
      authStore.patchUser({
        ...(updatedUser ?? {}),
        mustChangePassword: false,
        temporaryPasswordExpiresAt: null,
        temporaryPasswordExpired: false,
      });

      const check = await fetch(`${getApiBaseUrl()}/v1/auth/check`, {
        credentials: 'include',
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (check.ok) {
        const session = await check.json();
        if (session?.user) authStore.patchUser(session.user);
      }
    } catch (cause: any) {
      setError(cause?.message || 'No fue posible actualizar la contraseña');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="fixed inset-0 z-[100] overflow-y-auto bg-slate-100 px-4 py-8 sm:py-12" aria-labelledby="temporary-password-title">
      <div className="mx-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.35)] sm:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-950 text-white">
          <ShieldCheckIcon className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 id="temporary-password-title" className="mt-6 text-2xl font-bold tracking-[-0.02em] text-slate-950 sm:text-3xl">
          Define tu nueva contraseña
        </h1>
        <p className="mt-3 max-w-[65ch] text-sm leading-6 text-slate-700">
          La contraseña con la que ingresaste es temporal. Para proteger tu cuenta, debes reemplazarla antes de acceder al portal.
        </p>

        {expired ? (
          <div className="mt-6 rounded-xl bg-red-50 p-4" role="alert">
            <h2 className="font-bold text-red-900">La contraseña temporal venció</h2>
            <p className="mt-1 text-sm leading-6 text-red-800">Solicita al administrador que genere una nueva contraseña para tu cuenta.</p>
          </div>
        ) : (
          <form className="mt-7 space-y-5" onSubmit={submit}>
            <div>
              <label htmlFor="new-temporary-password" className="text-sm font-semibold text-slate-900">Nueva contraseña</label>
              <input
                id="new-temporary-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={submitting}
                aria-describedby="temporary-password-rules"
                className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 text-slate-950 outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Fortaleza</span>
                <span>{strength < 2 ? 'Débil' : strength < 4 ? 'En progreso' : 'Segura'}</span>
              </div>
              <div className="grid grid-cols-4 gap-2" aria-hidden="true">
                {passwordRules.map((_, index) => (
                  <span key={index} className={`h-1.5 rounded-full ${index < strength ? (strength === 4 ? 'bg-emerald-600' : 'bg-amber-500') : 'bg-slate-200'}`} />
                ))}
              </div>
              <ul id="temporary-password-rules" className="mt-4 grid gap-2 sm:grid-cols-2">
                {rules.map((rule) => (
                  <li key={rule.label} className={`flex items-center gap-2 text-sm ${rule.passed ? 'text-emerald-700' : 'text-slate-600'}`}>
                    <CheckCircleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {rule.label}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label htmlFor="confirm-temporary-password" className="text-sm font-semibold text-slate-900">Confirmar nueva contraseña</label>
              <input
                id="confirm-temporary-password"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={submitting}
                aria-invalid={Boolean(confirmation && confirmation !== newPassword)}
                className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 text-slate-950 outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              />
              {confirmation && confirmation !== newPassword && <p className="mt-2 text-sm font-medium text-red-700">Las contraseñas no coinciden.</p>}
            </div>

            {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">{error}</p>}

            <button
              type="submit"
              disabled={!valid || submitting}
              className="min-h-12 w-full rounded-lg bg-amber-500 px-5 font-bold text-white shadow-[0_8px_20px_-10px_rgba(217,119,6,0.8)] transition hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
            >
              {submitting ? 'Guardando contraseña…' : 'Guardar y continuar'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
