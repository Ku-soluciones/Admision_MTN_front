import api from '../../admin/services/api';
import { cleanRut } from '../../../packages/shared-ui/src/utils/rutUtils';

/**
 * Consulta al BFF si un RUT ya existe como estudiante registrado.
 * @param rut RUT formateado o sin formato.
 * @returns `true` si el RUT ya está registrado, `false` en caso contrario.
 */
export async function checkStudentRutExists(rut: string): Promise<boolean> {
    const normalized = cleanRut(rut);
    if (!normalized) return false;

    const { data } = await api.get<{ exists: boolean }>(
        `/v1/students/rut-exists/${encodeURIComponent(normalized)}`
    );
    return data.exists;
}

