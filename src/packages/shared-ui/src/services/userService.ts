import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import api from './api';
import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserFilters,
  PagedResponse,
  UserStats,
  UserRole,
  USER_ROLE_LABELS
} from '../types/user';
import { DataAdapter } from './dataAdapter';
import { getSecondaryAuth, hasFirebaseConfig } from '../src/lib/firebase';

class UserService {

  // ============= MÉTODOS PRINCIPALES =============

  /**
   * Obtener todos los usuarios con filtros y paginación
   */
  async getAllUsers(filters: UserFilters = {}): Promise<PagedResponse<User>> {
    try {

      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      if (filters.active !== undefined) params.append('active', filters.active.toString());
      if (filters.page !== undefined) params.append('page', filters.page.toString());
      if (filters.size !== undefined) params.append('size', filters.size.toString());
      if (filters.sort) params.append('sort', filters.sort);

      const response = await api.get(`/v1/users?${params.toString()}`);
      
      
      // Usar el adaptador para convertir datos simples a estructura compleja
      const adaptedResponse = DataAdapter.adaptUserApiResponse(response);
      
      return adaptedResponse;

    } catch (error: any) {
      throw this.handleError(error, 'Error al obtener los usuarios');
    }
  }

  /**
   * Obtener usuario por ID
   */
  async getUserById(id: number): Promise<User> {
    try {

      const response = await api.get(`/v1/users/${id}`);

      // DEFENSIVE: Validate response exists
      if (!response || !response.data) {
        throw new Error('No se recibió respuesta válida del servidor');
      }

      return response.data;

    } catch (error: any) {
      throw this.handleError(error, 'Error al obtener el usuario');
    }
  }

  /**
   * Crear nuevo usuario.
   *
   * Flujo:
   * 1. Crea el usuario en Firebase Auth con email + password usando una instancia
   *    secundaria (para no afectar la sesión del admin actual).
   * 2. Crea el usuario en el BFF (PostgreSQL).
   *
   * Si el email ya existe en Firebase, continúa creando solo en BFF (escenario común
   * al re-crear un usuario previamente eliminado).
   */
  async createUser(request: CreateUserRequest): Promise<User> {
    try {
      const password = (request as any).password;

      console.log('[UserService] === Creating user ===');
      console.log('[UserService] Email:', request.email);
      console.log('[UserService] Has password:', !!password);
      console.log('[UserService] hasFirebaseConfig:', hasFirebaseConfig);

      // 1. Crear en Firebase Auth (con instancia secundaria) - solo si hay password
      let firebaseIdToken: string | undefined;
      if (!password) {
        console.warn('[UserService] No password provided, skipping Firebase creation');
      } else if (!hasFirebaseConfig) {
        console.error('[UserService] Firebase NOT configured. User will NOT be created in Firebase!');
      } else {
        if (password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres');
        }

        const secondaryAuth = getSecondaryAuth();
        console.log('[UserService] Secondary auth obtained:', !!secondaryAuth);

        if (secondaryAuth) {
          try {
            console.log('[UserService] Creating user in Firebase...');
            const credential = await createUserWithEmailAndPassword(secondaryAuth, request.email, password);
            // idToken: el BFF lo verifica con Firebase Admin SDK y extrae firebase_uid
            firebaseIdToken = await credential.user.getIdToken();
            console.log('[UserService] ✅ User created in Firebase Auth');
            // Cerrar sesión secundaria inmediatamente (no afecta al admin)
            await signOut(secondaryAuth).catch(() => {});
          } catch (fbError: any) {
            const code = fbError?.code || '';
            console.error('[UserService] Firebase error code:', code, 'message:', fbError?.message);
            if (code === 'auth/email-already-in-use') {
              console.warn('[UserService] Email ya existe en Firebase, continuando con BFF:', request.email);
            } else if (code === 'auth/weak-password') {
              throw new Error('La contraseña es muy débil (Firebase requiere al menos 6 caracteres)');
            } else if (code === 'auth/invalid-email') {
              throw new Error('El email tiene un formato inválido');
            } else {
              throw new Error(fbError?.message || 'No se pudo crear el usuario en Firebase');
            }
          }
        } else {
          console.error('[UserService] Secondary auth is null - Firebase user will NOT be created');
        }
      }

      console.log('[UserService] Creating user in BFF...');
      // 2. Crear en BFF enviando firebaseIdToken para enlace.
      //    El BFF verifica el token y persiste firebase_uid + password='FIREBASE_MANAGED'.
      const payload = {
        ...request,
        ...(firebaseIdToken ? { firebaseIdToken } : {}),
      };
      const response = await api.post('/v1/users', payload);

      // DEFENSIVE: Validate response exists
      if (!response || !response.data) {
        if (firebaseIdToken) {
          console.error('[UserService] Usuario creado en Firebase pero BFF no respondió. Email:', request.email);
        }
        throw new Error('No se recibió respuesta válida del servidor');
      }

      return response.data;

    } catch (error: any) {
      throw this.handleError(error, 'Error al crear el usuario');
    }
  }

  /**
   * Actualizar usuario existente
   */
  async updateUser(id: number, request: UpdateUserRequest): Promise<User> {
    try {

      const response = await api.put(`/v1/users/${id}`, request);

      // DEFENSIVE: Validate response exists
      if (!response || !response.data) {
        throw new Error('No se recibió respuesta válida del servidor');
      }

      return response.data;

    } catch (error: any) {
      throw this.handleError(error, 'Error al actualizar el usuario');
    }
  }

  /**
   * Desactivar usuario
   */
  async deactivateUser(id: number): Promise<void> {
    try {

      await api.put(`/v1/users/${id}/deactivate`);
      

    } catch (error: any) {
      throw this.handleError(error, 'Error al desactivar el usuario');
    }
  }

  /**
   * Eliminar usuario permanentemente de la base de datos
   */
  async deleteUser(id: number): Promise<void> {
    try {

      await api.delete(`/v1/users/${id}`);
      

    } catch (error: any) {
      throw this.handleError(error, 'Error al eliminar el usuario');
    }
  }

  /**
   * Activar usuario
   */
  async activateUser(id: number): Promise<User> {
    try {

      const response = await api.put(`/v1/users/${id}/activate`);

      // DEFENSIVE: Validate response exists
      if (!response || !response.data) {
        throw new Error('No se recibió respuesta válida del servidor');
      }

      return response.data;

    } catch (error: any) {
      throw this.handleError(error, 'Error al activar el usuario');
    }
  }

  /**
   * Restablecer contraseña de usuario
   */
  async resetUserPassword(id: number): Promise<void> {
    try {

      await api.put(`/v1/users/${id}/reset-password`);
      

    } catch (error: any) {
      throw this.handleError(error, 'Error al restablecer la contraseña');
    }
  }

  /**
   * Obtener todos los roles disponibles
   */
  async getAllRoles(): Promise<UserRole[]> {
    try {

      const response = await api.get('/v1/users/roles');

      // DEFENSIVE: Validate response exists
      if (!response || !response.data) {
        // Fallback a los roles definidos en el frontend
        return Object.values(UserRole);
      }

      return response.data;

    } catch (error: any) {
      // Fallback a los roles definidos en el frontend
      return Object.values(UserRole);
    }
  }

  /**
   * Obtener estadísticas de usuarios
   */
  async getUserStats(): Promise<UserStats> {
    try {

      const response = await api.get('/v1/users/stats');

      // DEFENSIVE: Validate response exists
      if (!response || !response.data) {
        throw new Error('No se recibió respuesta válida del servidor');
      }

      return response.data;

    } catch (error: any) {
      throw this.handleError(error, 'Error al obtener las estadísticas');
    }
  }

  // ============= MÉTODOS DE UTILIDAD =============

  /**
   * Buscar usuarios por término de búsqueda
   */
  async searchUsers(searchTerm: string, filters: Omit<UserFilters, 'search'> = {}): Promise<PagedResponse<User>> {
    return this.getAllUsers({
      ...filters,
      search: searchTerm
    });
  }

  /**
   * Obtener usuarios por rol
   */
  async getUsersByRole(role: UserRole, filters: Omit<UserFilters, 'role'> = {}): Promise<PagedResponse<User>> {
    return this.getAllUsers({
      ...filters,
      role
    });
  }

  /**
   * Obtener usuarios activos
   */
  async getActiveUsers(filters: Omit<UserFilters, 'active'> = {}): Promise<PagedResponse<User>> {
    return this.getAllUsers({
      ...filters,
      active: true
    });
  }

  /**
   * Obtener solo usuarios del colegio (staff) - excluye APODERADOS
   */
  async getSchoolStaffUsers(filters: UserFilters = {}): Promise<PagedResponse<User>> {
    try {

      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      if (filters.active !== undefined) params.append('active', filters.active.toString());
      if (filters.page !== undefined) params.append('page', filters.page.toString());
      if (filters.size !== undefined) params.append('size', filters.size.toString());
      if (filters.sort) params.append('sort', filters.sort);

      // FIXED: Use /v1/users/staff endpoint which correctly excludes APODERADOS and supports pagination
      const response = await api.get(`/v1/users/staff?${params.toString()}`);


      // Backend /v1/users/staff already returns paginated format, no adapter needed
      return response.data;

    } catch (error: any) {
      throw this.handleError(error, 'Error al obtener usuarios del colegio');
    }
  }

  /**
   * Obtener usuarios inactivos
   */
  async getInactiveUsers(filters: Omit<UserFilters, 'active'> = {}): Promise<PagedResponse<User>> {
    return this.getAllUsers({
      ...filters,
      active: false
    });
  }

  /**
   * Obtener evaluadores activos
   */
  async getActiveEvaluators(): Promise<PagedResponse<User>> {
    const evaluatorRoles = [
      UserRole.TEACHER,
      UserRole.COORDINATOR,
      UserRole.CYCLE_DIRECTOR,
      UserRole.PSYCHOLOGIST
    ];

    // Como el backend no soporta filtro por múltiples roles, 
    // haremos múltiples llamadas y las combinamos
    try {
      const promises = evaluatorRoles.map(role => 
        this.getUsersByRole(role, { active: true })
      );
      
      const results = await Promise.all(promises);
      
      // Combinar todos los usuarios
      const allUsers: User[] = [];
      let totalElements = 0;
      
      results.forEach(result => {
        allUsers.push(...result.content);
        totalElements += result.totalElements;
      });

      return {
        content: allUsers,
        totalElements,
        totalPages: Math.ceil(totalElements / 10),
        number: 0,
        size: totalElements,
        first: true,
        last: true,
        numberOfElements: allUsers.length,
        empty: allUsers.length === 0
      };

    } catch (error: any) {
      throw this.handleError(error, 'Error al obtener los evaluadores');
    }
  }

  // ============= VALIDACIONES =============

  /**
   * Validar datos de usuario antes de enviar
   */
  validateUserData(data: CreateUserRequest | UpdateUserRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar nombre
    if (!data.firstName || data.firstName.trim().length < 2) {
      errors.push('El nombre debe tener al menos 2 caracteres');
    }

    // Validar apellido
    if (!data.lastName || data.lastName.trim().length < 2) {
      errors.push('El apellido debe tener al menos 2 caracteres');
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      errors.push('El formato del email no es válido');
    }

    // Validar RUT
    const rutRegex = /^[0-9]+-[0-9kK]$/;
    if (!data.rut || !rutRegex.test(data.rut)) {
      errors.push('El formato del RUT no es válido (ej: 12345678-9)');
    }

    // Validar contraseña para creación
    if ('password' in data && data.password && data.password.length < 8) {
      errors.push('La contraseña debe tener al menos 8 caracteres');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }


  /**
   * Obtener usuarios del colegio sin autenticación (público)
   */
  async getSchoolStaffUsersPublic(): Promise<PagedResponse<User>> {
    try {

      const response = await api.get('/v1/users/public/school-staff');

      // DEFENSIVE: Validate response exists
      if (!response || !response.data) {
        throw new Error('No se recibió respuesta válida del servidor');
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Error al obtener usuarios del colegio');
    }
  }

  // ============= MANEJO DE ERRORES =============

  private handleError(error: any, defaultMessage: string): Error {
    const message = error.response?.data?.message ||
                   error.response?.data?.error ||
                   error.message ||
                   defaultMessage;

    return new Error(message);
  }
}

export const userService = new UserService();
