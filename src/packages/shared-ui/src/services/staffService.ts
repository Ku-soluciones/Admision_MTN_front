import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import api from './http';
import { User, CreateUserRequest, UpdateUserRequest, UserFilters, PagedResponse, UserStats } from '../types/user';
import { getSecondaryAuth, hasFirebaseConfig } from '../src/lib/firebase';
import { getApiBaseUrl } from '../config/api.config';

/**
 * Service for managing school staff (excludes guardians/apoderados)
 * Handles ADMIN, TEACHER, COORDINATOR, PSYCHOLOGIST, CYCLE_DIRECTOR roles
 */
class StaffService {
  private readonly BASE_URL = '/v1/users/staff';

  /**
   * Get paginated list of staff members
   */
  async getStaffUsers(filters: UserFilters): Promise<PagedResponse<User>> {
    const params = new URLSearchParams();

    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.active !== undefined) params.append('active', filters.active.toString());

    const response = await api.get<PagedResponse<User>>(`${this.BASE_URL}?${params.toString()}`);
    return response;  // httpClient.get already unwraps response.data
  }

  /**
   * Get staff user by ID
   */
  async getStaffUserById(id: number): Promise<User> {
    const response = await api.get<{ success: boolean; data: User }>(`/v1/users/${id}`);
    return response.data.data;
  }

  /**
   * Create new staff member.
   *
   * Replica el flujo del auto-registro de apoderado para garantizar enlace
   * con Firebase y password='FIREBASE_MANAGED' en BD:
   *   1. Crea el usuario en Firebase Auth (instancia secundaria, no afecta admin).
   *   2. Llama POST /v1/auth/firebase-register con idToken → graba firebase_uid +
   *      password='FIREBASE_MANAGED' en BD (siempre como APODERADO).
   *   3. PUT /v1/users/{id} para promover al rol real (TEACHER, COORDINATOR, etc.)
   *      y completar subject/educationalLevel. Este update NO toca password ni
   *      firebase_uid.
   *   4. signOut de la sesión secundaria.
   */
  async createStaffUser(userData: CreateUserRequest): Promise<User> {
    // Ensure role is not APODERADO
    if (userData.role === 'APODERADO') {
      throw new Error('Use guardianService to create guardians');
    }

    const password = (userData as any).password;
    if (!password || password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    if (!hasFirebaseConfig) {
      throw new Error('Firebase no está configurado en este entorno');
    }
    const secondaryAuth = getSecondaryAuth();
    if (!secondaryAuth) {
      throw new Error('No se pudo inicializar la instancia secundaria de Firebase');
    }

    // 1. Crear en Firebase y obtener idToken
    let idToken: string;
    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, password);
      idToken = await credential.user.getIdToken();
    } catch (fbError: any) {
      const code = fbError?.code || '';
      // Aseguramos cerrar la sesión secundaria aunque haya fallado el alta
      signOut(secondaryAuth).catch(() => {});
      if (code === 'auth/email-already-in-use') {
        throw new Error('Ya existe un usuario con este email en Firebase');
      } else if (code === 'auth/weak-password') {
        throw new Error('La contraseña es muy débil (Firebase requiere al menos 6 caracteres)');
      } else if (code === 'auth/invalid-email') {
        throw new Error('El email tiene un formato inválido');
      }
      console.error('[StaffService] Error creando en Firebase:', fbError);
      throw new Error(fbError?.message || 'No se pudo crear el usuario en Firebase');
    }

    // 2. Registrar en BFF vía firebase-register usando `fetch` AISLADO con
    //    `credentials: 'omit'`. Esto es crítico para no romper la sesión del admin:
    //      - El browser NO enviará la cookie HttpOnly del admin.
    //      - El browser tampoco aceptará/aplicará el `Set-Cookie` que el BFF
    //        emita para el nuevo usuario (regla de same-site cookies con
    //        `credentials: 'omit'`), por lo que la cookie de refresh del admin
    //        permanece intacta.
    //    Además NO usamos `api` (axios) porque su interceptor inyectaría el
    //    Bearer del admin en la petición.
    let createdUserId: number | undefined;
    try {
      const response = await fetch(`${getApiBaseUrl()}/v1/auth/firebase-register`, {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          idToken,
          firstName: userData.firstName,
          lastName: userData.lastName,
          rut: userData.rut,
          phone: userData.phone,
        }),
      });
      if (!response.ok) {
        let errMsg = `firebase-register HTTP ${response.status}`;
        try {
          const errBody = await response.json();
          errMsg = errBody?.message || errBody?.error?.message || errMsg;
        } catch { /* body no JSON */ }
        throw new Error(errMsg);
      }
      const body: any = await response.json();
      createdUserId = body?.user?.id ?? body?.data?.id ?? body?.id;
      if (!createdUserId) {
        console.error('[StaffService] firebase-register no devolvió id:', body);
        throw new Error('El BFF no devolvió el id del usuario creado');
      }
    } catch (regError: any) {
      console.error('[StaffService] firebase-register falló:', regError);
      throw new Error(regError?.message || 'No se pudo registrar el usuario');
    } finally {
      signOut(secondaryAuth).catch(() => {});
    }

    // 3. Promover rol y completar campos específicos de staff
    try {
      const updatePayload: any = {
        role: userData.role,
        firstName: userData.firstName,
        lastName: userData.lastName,
        rut: userData.rut,
        phone: userData.phone,
      };
      if ((userData as any).subject) updatePayload.subject = (userData as any).subject;
      if ((userData as any).educationalLevel) updatePayload.educationalLevel = (userData as any).educationalLevel;

      const updated: any = await api.put(`/v1/users/${createdUserId}`, updatePayload);
      const body: any = updated?.data ?? updated;
      const data: any = body?.data ?? body;
      return data as User;
    } catch (updateError: any) {
      console.error(
        `[StaffService] Usuario creado (id=${createdUserId}) pero falló asignación de rol:`,
        updateError,
      );
      throw new Error(
        `Usuario creado en Firebase y BD pero no se pudo asignar el rol "${userData.role}" ` +
        `(id=${createdUserId}). Edítalo manualmente. Detalle: ${updateError?.message || ''}`
      );
    }
  }

  /**
   * Update staff member
   */
  async updateStaffUser(id: number, userData: UpdateUserRequest): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>(`/v1/users/${id}`, userData);
    return response.data.data;
  }

  /**
   * Delete staff member
   */
  async deleteStaffUser(id: number): Promise<void> {
    try {
      await api.delete(`/v1/users/${id}`);
    } catch (error: any) {
      // Preservar el código de estado del error para que el componente pueda detectar 409
      // El httpClient lanza HttpError con la propiedad 'status'
      throw error;
    }
  }

  /**
   * Activate staff member
   */
  async activateStaffUser(id: number): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>(`/v1/users/${id}/activate`);
    return response.data.data;
  }

  /**
   * Deactivate staff member
   */
  async deactivateStaffUser(id: number): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>(`/v1/users/${id}/deactivate`);
    return response.data.data;
  }

  /**
   * Reset staff member password
   */
  async resetStaffPassword(id: number): Promise<void> {
    await api.put(`/v1/users/${id}/reset-password`);
  }

  /**
   * Get staff statistics
   */
  async getStaffStats(): Promise<UserStats> {
    const response = await api.get<{ success: boolean; data: UserStats }>('/v1/users/stats');
    return response.data.data;
  }

  /**
   * Get available roles for staff
   */
  async getStaffRoles(): Promise<string[]> {
    const response = await api.get<{ success: boolean; data: string[] }>('/v1/users/roles');
    // Filter out APODERADO role
    return response.data.data.filter(role => role !== 'APODERADO');
  }
}

export const staffService = new StaffService();
export default staffService;
