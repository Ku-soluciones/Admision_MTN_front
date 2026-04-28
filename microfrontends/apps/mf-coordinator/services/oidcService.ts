/**
 * OIDC Service - Integración con Keycloak para el Sistema de Admisión MTN
 * Maneja autenticación, autorización y roles con RBAC
 */

import { UserManager, WebStorageStateStore, User } from 'oidc-client-ts';
import { OIDC_CONFIG, CHILEAN_CONFIG } from './config';

export interface MTNUser extends User {
  profile: {
    sub: string;
    email: string;
    preferred_username: string;
    given_name: string;
    family_name: string;
    name: string;
    roles: string[];
    educational_level?: string;
    subject_specialization?: string;
    rut?: string;
    phone?: string;
    [key: string]: any;
  };
}

export interface AuthState {
  user: MTNUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  roles: string[];
  permissions: string[];
}

/**
 * Servicio OIDC para manejo de autenticación con Keycloak
 */
class OidcService {
  private userManager: UserManager;
  private user: MTNUser | null = null;
  private authStateListeners: ((state: AuthState) => void)[] = [];

  constructor() {
    // Configuración del UserManager para Keycloak
    this.userManager = new UserManager({
      authority: OIDC_CONFIG.ISSUER,
      client_id: OIDC_CONFIG.CLIENT_ID,
      client_secret: OIDC_CONFIG.CLIENT_SECRET || undefined,
      redirect_uri: OIDC_CONFIG.REDIRECT_URI,
      post_logout_redirect_uri: OIDC_CONFIG.POST_LOGOUT_REDIRECT_URI,
      response_type: OIDC_CONFIG.RESPONSE_TYPE,
      scope: OIDC_CONFIG.SCOPE,
      automaticSilentRenew: true,
      silentRequestTimeout: 30000,
      includeIdTokenInSilentRenew: true,
      
      // Storage para tokens (compatible con PII masking chileno)
      userStore: new WebStorageStateStore({ store: window.localStorage }),
      
      // Configuración adicional para producción
      loadUserInfo: true,
      clockSkew: 300, // 5 minutes tolerance
      
      // Configuración específica para Chile
      extraQueryParams: {
        kc_locale: CHILEAN_CONFIG.LOCALE,
        timezone: CHILEAN_CONFIG.TIMEZONE,
      },
      
      // Headers de seguridad adicionales
      extraHeaders: {
        'X-Timezone': CHILEAN_CONFIG.TIMEZONE,
        'X-Client-Type': 'mtn-admission-web',
      },
    });

    // Event listeners para manejo de estados
    this.userManager.events.addUserLoaded(this.handleUserLoaded.bind(this));
    this.userManager.events.addUserUnloaded(this.handleUserUnloaded.bind(this));
    this.userManager.events.addAccessTokenExpiring(this.handleTokenExpiring.bind(this));
    this.userManager.events.addAccessTokenExpired(this.handleTokenExpired.bind(this));
    this.userManager.events.addSilentRenewError(this.handleSilentRenewError.bind(this));
    this.userManager.events.addUserSignedOut(this.handleUserSignedOut.bind(this));

    // Inicializar usuario si ya está autenticado
    this.initializeUser();
  }

  /**
   * Inicializar usuario desde storage
   */
  private async initializeUser(): Promise<void> {
    try {
      const user = await this.userManager.getUser();
      if (user && !user.expired) {
        this.user = user as MTNUser;
        this.notifyAuthStateChange();
      }
    } catch (error) {
      console.error('Error inicializando usuario OIDC:', error);
    }
  }

  /**
   * Iniciar proceso de login
   */
  async login(role?: 'admin' | 'user'): Promise<void> {
    try {
      const clientId = role === 'admin' ? OIDC_CONFIG.ADMIN_CLIENT_ID : OIDC_CONFIG.CLIENT_ID;
      const redirectUri = role === 'admin' ? OIDC_CONFIG.ADMIN_REDIRECT_URI : OIDC_CONFIG.REDIRECT_URI;
      
      // Actualizar configuración para el rol específico
      if (role === 'admin') {
        this.userManager = new UserManager({
          ...this.userManager.settings,
          client_id: clientId,
          redirect_uri: redirectUri,
        });
      }

      await this.userManager.signinRedirect({
        extraQueryParams: {
          kc_locale: CHILEAN_CONFIG.LOCALE,
          timezone: CHILEAN_CONFIG.TIMEZONE,
          login_hint: role,
        }
      });
    } catch (error) {
      console.error('Error en login OIDC:', error);
      this.notifyAuthStateChange();
      throw error;
    }
  }

  /**
   * Completar callback de login
   */
  async handleCallback(): Promise<MTNUser | null> {
    try {
      const user = await this.userManager.signinRedirectCallback();
      this.user = user as MTNUser;
      this.notifyAuthStateChange();
      return this.user;
    } catch (error) {
      console.error('Error en callback OIDC:', error);
      this.notifyAuthStateChange();
      throw error;
    }
  }

  /**
   * Logout del usuario
   */
  async logout(): Promise<void> {
    try {
      await this.userManager.signoutRedirect({
        extraQueryParams: {
          kc_locale: CHILEAN_CONFIG.LOCALE,
        }
      });
    } catch (error) {
      console.error('Error en logout OIDC:', error);
      // Limpiar usuario local even if remote logout fails
      this.user = null;
      this.notifyAuthStateChange();
      throw error;
    }
  }

  /**
   * Renovación silenciosa de token
   */
  async renewToken(): Promise<MTNUser | null> {
    try {
      const user = await this.userManager.signinSilent();
      this.user = user as MTNUser;
      this.notifyAuthStateChange();
      return this.user;
    } catch (error) {
      console.error('Error renovando token:', error);
      return null;
    }
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): MTNUser | null {
    return this.user;
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return this.user !== null && !this.user.expired;
  }

  /**
   * Obtener roles del usuario
   */
  getUserRoles(): string[] {
    if (!this.user) return [];
    
    const roles: string[] = [];
    
    // Extraer roles de diferentes formatos de claims
    if (this.user.profile.roles) {
      roles.push(...this.user.profile.roles);
    }
    
    // Formato Keycloak realm_access
    const realmAccess = (this.user.profile as any).realm_access;
    if (realmAccess?.roles) {
      roles.push(...realmAccess.roles);
    }
    
    // Formato resource_access
    const resourceAccess = (this.user.profile as any).resource_access;
    if (resourceAccess?.['web-guardianes']?.roles) {
      roles.push(...resourceAccess['web-guardianes'].roles);
    }
    if (resourceAccess?.['web-admin']?.roles) {
      roles.push(...resourceAccess['web-admin'].roles);
    }
    
    return [...new Set(roles)]; // Remove duplicates
  }

  /**
   * Verificar si el usuario tiene un rol específico
   */
  hasRole(role: string): boolean {
    const userRoles = this.getUserRoles();
    return userRoles.includes(role) || userRoles.includes(`ROLE_${role}`);
  }

  /**
   * Verificar si el usuario tiene alguno de los roles especificados
   */
  hasAnyRole(roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  /**
   * Obtener token de acceso
   */
  getAccessToken(): string | null {
    return this.user?.access_token || null;
  }

  /**
   * Obtener información específica para Chile
   */
  getChileanUserInfo(): {
    rut?: string;
    maskedRut?: string;
    phone?: string;
    maskedPhone?: string;
    timezone: string;
    locale: string;
  } {
    const profile = this.user?.profile;
    
    return {
      rut: profile?.rut,
      maskedRut: this.maskRut(profile?.rut),
      phone: profile?.phone,
      maskedPhone: this.maskPhone(profile?.phone),
      timezone: CHILEAN_CONFIG.TIMEZONE,
      locale: CHILEAN_CONFIG.LOCALE,
    };
  }

  /**
   * Enmascarar RUT para cumplimiento chileno
   */
  private maskRut(rut?: string): string | undefined {
    if (!rut || !CHILEAN_CONFIG.RUT_MASKING) return rut;
    
    // Format: XX.XXX.XXX-X -> XX.***.**-*
    const rutPattern = /^(\d{1,2})\.\d{3}\.\d{3}-(\w)$/;
    const match = rut.match(rutPattern);
    
    if (match) {
      return `${match[1]}.***.**-*`;
    }
    
    return '**.***.**-*';
  }

  /**
   * Enmascarar teléfono para cumplimiento chileno
   */
  private maskPhone(phone?: string): string | undefined {
    if (!phone) return phone;
    
    // Format: +56-9-XXXX-XXXX -> +56-9-***-****
    const phonePattern = /^(\+56-9-)(\d{4})-(\d{4})$/;
    const match = phone.match(phonePattern);
    
    if (match) {
      return `${match[1]}***-****`;
    }
    
    return '+56-9-***-****';
  }

  /**
   * Event handlers
   */
  private handleUserLoaded(user: User): void {
    console.log('👤 Usuario OIDC cargado:', this.maskUserInfo(user));
    this.user = user as MTNUser;
    this.notifyAuthStateChange();
  }

  private handleUserUnloaded(): void {
    console.log('👤 Usuario OIDC descargado');
    this.user = null;
    this.notifyAuthStateChange();
  }

  private handleTokenExpiring(): void {
    console.log('⏰ Token OIDC próximo a expirar, renovando...');
    this.renewToken();
  }

  private handleTokenExpired(): void {
    console.log('⏰ Token OIDC expirado');
    this.user = null;
    this.notifyAuthStateChange();
  }

  private handleSilentRenewError(error: Error): void {
    console.error('❌ Error en renovación silenciosa:', error);
    this.notifyAuthStateChange();
  }

  private handleUserSignedOut(): void {
    console.log('👋 Usuario desconectado');
    this.user = null;
    this.notifyAuthStateChange();
  }

  /**
   * Enmascarar información del usuario para logs
   */
  private maskUserInfo(user: User): any {
    return {
      sub: user.profile.sub,
      email: this.maskEmail(user.profile.email),
      name: user.profile.name,
      roles: this.getUserRoles(),
      expired: user.expired,
    };
  }

  /**
   * Enmascarar email para cumplimiento chileno
   */
  private maskEmail(email?: string): string | undefined {
    if (!email || !CHILEAN_CONFIG.PII_PROTECTION) return email;
    
    const atIndex = email.indexOf('@');
    if (atIndex <= 3) return email;
    
    return email.substring(0, 3) + '***@' + email.substring(atIndex + 1);
  }

  /**
   * Gestión de listeners de estado de autenticación
   */
  addAuthStateListener(listener: (state: AuthState) => void): void {
    this.authStateListeners.push(listener);
  }

  removeAuthStateListener(listener: (state: AuthState) => void): void {
    const index = this.authStateListeners.indexOf(listener);
    if (index > -1) {
      this.authStateListeners.splice(index, 1);
    }
  }

  private notifyAuthStateChange(): void {
    const state: AuthState = {
      user: this.user,
      isAuthenticated: this.isAuthenticated(),
      isLoading: false,
      error: null,
      roles: this.getUserRoles(),
      permissions: [], // TODO: Implement permissions if needed
    };

    this.authStateListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error notificando cambio de estado auth:', error);
      }
    });
  }

  /**
   * Cleanup - remover event listeners
   */
  dispose(): void {
    this.userManager.events.removeUserLoaded(this.handleUserLoaded.bind(this));
    this.userManager.events.removeUserUnloaded(this.handleUserUnloaded.bind(this));
    this.userManager.events.removeAccessTokenExpiring(this.handleTokenExpiring.bind(this));
    this.userManager.events.removeAccessTokenExpired(this.handleTokenExpired.bind(this));
    this.userManager.events.removeSilentRenewError(this.handleSilentRenewError.bind(this));
    this.userManager.events.removeUserSignedOut(this.handleUserSignedOut.bind(this));
    this.authStateListeners.length = 0;
  }
}

// Singleton instance
export const oidcService = new OidcService();
export default oidcService;