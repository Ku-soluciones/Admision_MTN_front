import { flag } from 'flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';

/**
 * Flag: process-active-teacher
 *
 * Controla si existe un proceso de postulación activo para profesores.
 * Cuando está en `false`, se bloquea el inicio de sesión ya que no hay
 * un proceso de admisión activo.
 *
 * Kind: boolean
 * Variants:
 *   - true  → On  (proceso activo, login habilitado)
 *   - false → Off (proceso inactivo, login bloqueado)
 */
export const processActiveTeacher = flag<boolean>({
  key: 'process-active-teacher',
  description: 'Controla si hay un proceso de postulación activo para profesores',
  defaultValue: false,
  options: [
    { value: false, label: 'Off' },
    { value: true, label: 'On' },
  ],
  adapter: vercelAdapter(),
});

/**
 * Flag: process-active-guard
 *
 * Controla si existe un proceso de postulación activo para apoderados.
 * Cuando está en `false`, se bloquea el inicio de sesión ya que no hay
 * un proceso de admisión activo.
 *
 * Kind: boolean
 * Variants:
 *   - true  → On  (proceso activo, login habilitado)
 *   - false → Off (proceso inactivo, login bloqueado)
 */
export const processActiveGuard = flag<boolean>({
  key: 'process-active-guard',
  description: 'Controla si hay un proceso de postulación activo para apoderados',
  defaultValue: false,
  options: [
    { value: false, label: 'Off' },
    { value: true, label: 'On' },
  ],
  adapter: vercelAdapter(),
});
