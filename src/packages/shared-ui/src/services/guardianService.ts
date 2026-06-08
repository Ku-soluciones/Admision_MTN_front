import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import api from './http';
import { User, CreateUserRequest, UpdateUserRequest, UserFilters, PagedResponse, UserStats } from '../types/user';
import { getSecondaryAuth, hasFirebaseConfig } from '../src/lib/firebase';
import { getApiBaseUrl } from '../config/api.config';

/**
 * Service for managing guardians (only APODERADO role)
 */
class GuardianService {
  private readonly BASE_URL = '/v1/users/guardians';

  /**
   * Get paginated list of guardians
   */
  async getGuardianUsers(filters: UserFilters): Promise<PagedResponse<User>> {
    const params = new URLSearchParams();

    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.active !== undefined) params.append('active', filters.active.toString());

    const response = await api.get<PagedResponse<User>>(`${this.BASE_URL}?${params.toString()}`);
    return response;  // httpClient.get already unwraps response.data
  }

  /**
   * Get guardian user by ID
   */
  async getGuardianUserById(id: number): Promise<User> {
    const response = await api.get<{ success: boolean; data: User }>(`/v1/users/${id}`);
    return response.data.data;
  }

  /**
   * Create new guardian.
   *
   * Flujo (replicando el auto-registro de apoderado, sin tocar el backend desplegado):
   * 1. Crea el usuario en Firebase Auth con instancia secundaria (no afecta admin).
   * 2. Llama a `POST /v1/auth/firebase-register` con el idToken — ese endpoint ya
   *    enlaza `firebase_uid` y guarda `password='FIREBASE_MANAGED'` como APODERADO.
   * 3. Cierra la sesión secundaria.
   *
   * Esto garantiza que el usuario quede idéntico a un apoderado registrado por
   * su cuenta (mismo password='FIREBASE_MANAGED', mismo enlace de UID).
   */
  async createGuardianUser(userData: CreateUserRequest): Promise<User> {
    // Ensure role is APODERADO
    if (userData.role !== 'APODERADO') {
      throw new Error('Use staffService to create staff members');
    }

    // Validar contraseña (Firebase requiere mínimo 6 chars)
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

    // 1. Crear en Firebase Auth (instancia secundaria) y obtener idToken
    let idToken: string;
    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, password);
      idToken = await credential.user.getIdToken();
    } catch (fbError: any) {
      const code = fbError?.code || '';
      if (code === 'auth/email-already-in-use') {
        throw new Error('Ya existe un usuario con este email en Firebase');
      } else if (code === 'auth/weak-password') {
        throw new Error('La contraseña es muy débil (Firebase requiere al menos 6 caracteres)');
      } else if (code === 'auth/invalid-email') {
        throw new Error('El email tiene un formato inválido');
      }
      console.error('[GuardianService] Error creando usuario en Firebase:', fbError);
      throw new Error(fbError?.message || 'No se pudo crear el usuario en Firebase');
    } finally {
      signOut(secondaryAuth).catch(() => {});
    }

    // 2. Registrar en BFF vía firebase-register usando `fetch` AISLADO con
    //    `credentials: 'omit'` para no romper la sesión del admin actual:
    //      - El browser NO envía la cookie HttpOnly del admin.
    //      - El browser NO acepta el `Set-Cookie` del nuevo usuario.
    //    Así, la sesión del admin queda intacta.
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
      const created = body?.user ?? body?.data ?? body;
      return {
        id: created.id,
        email: created.email ?? userData.email,
        firstName: created.firstName ?? userData.firstName,
        lastName: created.lastName ?? userData.lastName,
        fullName: `${created.firstName ?? userData.firstName} ${created.lastName ?? userData.lastName}`.trim(),
        role: 'APODERADO' as any,
        rut: created.rut ?? userData.rut ?? '',
        phone: created.phone ?? userData.phone ?? '',
        active: true,
        emailVerified: false,
        createdAt: created.createdAt ?? new Date().toISOString(),
      } as User;
    } catch (regError: any) {
      console.error('[GuardianService] firebase-register falló:', regError);
      throw new Error(regError?.message || 'No se pudo registrar el apoderado');
    }
  }

  /**
   * Update guardian
   */
  async updateGuardianUser(id: number, userData: UpdateUserRequest): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>(`/v1/users/${id}`, userData);
    return response.data.data;
  }

  /**
   * Delete guardian
   */
  async deleteGuardianUser(id: number): Promise<void> {
    await api.delete(`/v1/users/${id}`);
  }

  /**
   * Activate guardian
   */
  async activateGuardianUser(id: number): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>(`/v1/users/${id}/activate`);
    return response.data.data;
  }

  /**
   * Deactivate guardian
   */
  async deactivateGuardianUser(id: number): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>(`/v1/users/${id}/deactivate`);
    return response.data.data;
  }

  /**
   * Reset guardian password
   */
  async resetGuardianPassword(id: number): Promise<void> {
    await api.put(`/v1/users/${id}/reset-password`);
  }

  /**
   * Get guardian statistics
   */
  async getGuardianStats(): Promise<UserStats> {
    const response = await api.get<{ success: boolean; data: UserStats }>('/v1/users/stats');
    return response.data.data;
  }
}

export const guardianService = new GuardianService();
export default guardianService;
