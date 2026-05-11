import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import api from './http';
import publicApi from './api';
import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserFilters,
  PagedResponse,
  UserStats,
  USER_ROLE_LABELS,
  EDUCATIONAL_LEVEL_LABELS,
  SUBJECT_LABELS,
} from '../types/user';
import { getSecondaryAuth, hasFirebaseConfig } from '../../../packages/shared-ui/src/src/lib/firebase';

/**
 * Service for managing school staff (excludes guardians/apoderados)
 * Handles ADMIN, TEACHER, COORDINATOR, PSYCHOLOGIST, CYCLE_DIRECTOR roles
 */
class StaffService {
  private readonly BASE_URL = '/v1/users/staff';
  private readonly PUBLIC_STAFF_URL = '/v1/users/public/school-staff';

  private normalizeStaffUser(user: any): User {
    const role = user.role as User['role'];
    const educationalLevel = user.educationalLevel as User['educationalLevel'];
    const subject = user.subject as User['subject'];

    return {
      ...user,
      fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      rut: user.rut || '',
      role,
      roleDisplayName: user.roleDisplayName || USER_ROLE_LABELS[role] || user.role || '',
      educationalLevel,
      educationalLevelDisplayName: user.educationalLevelDisplayName || (educationalLevel ? EDUCATIONAL_LEVEL_LABELS[educationalLevel] : undefined),
      subject,
      subjectDisplayName: user.subjectDisplayName || (subject ? SUBJECT_LABELS[subject] : undefined),
      emailVerified: Boolean(user.emailVerified),
      active: user.active !== false,
      createdAt: user.createdAt || new Date().toISOString(),
    };
  }

  private toPagedResponse(users: User[], filters: UserFilters): PagedResponse<User> {
    const page = filters.page ?? 0;
    const size = filters.size ?? (users.length || 1);
    const start = page * size;
    const content = users.slice(start, start + size);
    const totalPages = Math.max(1, Math.ceil(users.length / size));

    return {
      content,
      totalElements: users.length,
      totalPages,
      number: page,
      size,
      first: page === 0,
      last: page >= totalPages - 1,
      numberOfElements: content.length,
      empty: content.length === 0,
    };
  }

  private applyFilters(users: User[], filters: UserFilters): User[] {
    const search = filters.search?.trim().toLowerCase();

    return users.filter((user) => {
      if (filters.role && user.role !== filters.role) return false;
      if (filters.active !== undefined && user.active !== filters.active) return false;
      if (search) {
        const haystack = `${user.fullName} ${user.firstName} ${user.lastName} ${user.email} ${user.rut}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }

  /**
   * Get paginated list of staff members
   */
  async getStaffUsers(filters: UserFilters): Promise<PagedResponse<User>> {
    const response = await publicApi.get(this.PUBLIC_STAFF_URL);
    const rawUsers = response.data?.content || response.data?.data || [];
    const users = this.applyFilters(rawUsers.map((user: any) => this.normalizeStaffUser(user)), filters);
    return this.toPagedResponse(users, filters);
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
   * Flujo (replicando el registro de apoderado, sin tocar el backend desplegado):
   * 1. Crea el usuario en Firebase Auth con instancia secundaria (no afecta admin).
   * 2. Llama a `POST /v1/auth/firebase-register` con el idToken — ese endpoint
   *    YA enlaza `firebase_uid` y guarda `password='FIREBASE_MANAGED'` en BD,
   *    pero SIEMPRE como APODERADO.
   * 3. Si el role objetivo no es APODERADO, hace `PUT /v1/users/{id}` para
   *    corregir role/subject/educationalLevel/rut/phone.
   * 4. Cierra la sesión secundaria.
   *
   * Esto garantiza que el usuario quede con el mismo formato en BD que un
   * apoderado registrado por su cuenta (firebase_uid + FIREBASE_MANAGED).
   */
  async createStaffUser(userData: CreateUserRequest): Promise<User> {
    // Ensure role is not APODERADO
    if (userData.role === 'APODERADO') {
      throw new Error('Use guardianService to create guardians');
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
      console.error('[StaffService] Error creando usuario en Firebase:', fbError);
      throw new Error(fbError?.message || 'No se pudo crear el usuario en Firebase');
    } finally {
      // Aseguramos cerrar la sesión secundaria pase lo que pase
      signOut(secondaryAuth).catch(() => {});
    }

    // 2. Registrar en BFF vía firebase-register (público, ya soporta enlace UID)
    //    Usamos publicApi para evitar inyectar el token del admin en este request.
    let createdUserId: number | undefined;
    try {
      const registerResp = await publicApi.post<any>('/v1/auth/firebase-register', {
        idToken,
        firstName: userData.firstName,
        lastName: userData.lastName,
        rut: userData.rut,
        phone: userData.phone,
      });
      // El endpoint devuelve { token, user: { id, ... }, ... }
      const body = registerResp?.data ?? registerResp;
      createdUserId = body?.user?.id ?? body?.data?.id ?? body?.id;
      if (!createdUserId) {
        console.error('[StaffService] firebase-register no devolvió id de usuario:', body);
        throw new Error('El BFF no devolvió el id del usuario creado');
      }
    } catch (regError: any) {
      console.error('[StaffService] firebase-register falló:', regError);
      throw new Error(regError?.response?.data?.message || regError?.message || 'No se pudo registrar el usuario en el sistema');
    }

    // 3. Promover el rol y completar campos específicos de staff (subject, educationalLevel)
    //    El endpoint PUT /v1/users/{id} requiere auth admin (ya la tenemos en `api`).
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

      const updated = await api.put<any>(`/v1/users/${createdUserId}`, updatePayload);
      const body: any = (updated as any)?.data ?? updated;
      const data: any = body?.data ?? body;
      return this.normalizeStaffUser(data);
    } catch (updateError: any) {
      console.error(
        `[StaffService] Usuario creado (id=${createdUserId}) pero falló la asignación de rol/datos:`,
        updateError,
      );
      throw new Error(
        `Usuario creado pero no se pudo asignar el rol "${userData.role}". ` +
        `Edítalo manualmente (id=${createdUserId}). Detalle: ${updateError?.message || ''}`
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
    const response = await this.getStaffUsers({ page: 0, size: 10000 });
    const users = response.content;
    const roleStats = users.reduce<Record<string, number>>((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    return {
      totalUsers: users.length,
      activeUsers: users.filter((user) => user.active).length,
      inactiveUsers: users.filter((user) => !user.active).length,
      verifiedUsers: users.filter((user) => user.emailVerified).length,
      unverifiedUsers: users.filter((user) => !user.emailVerified).length,
      roleStats,
    };
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
