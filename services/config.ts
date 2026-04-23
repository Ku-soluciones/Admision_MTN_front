// Environment-aware configuration
const getEnvVar = (name: string, defaultValue: string = ''): string => {
  return import.meta.env[name] || defaultValue;
};

// API Base URL - points to API Gateway for microservices
export const API_BASE_URL = getEnvVar('VITE_API_BASE_URL', 'http://localhost');
export const API_GATEWAY_URL = getEnvVar('VITE_API_GATEWAY_URL', 'http://localhost');

// Security Configuration
export const SECURITY_CONFIG = {
  LEVEL: getEnvVar('VITE_SECURITY_LEVEL', 'development'),
  CSP_ENABLED: getEnvVar('VITE_CSP_ENABLED', 'false') === 'true',
  HTTPS_REQUIRED: getEnvVar('VITE_HTTPS_REQUIRED', 'false') === 'true',
  SECURE_COOKIES: getEnvVar('VITE_SECURE_COOKIES', 'false') === 'true',
  HSTS_ENABLED: getEnvVar('VITE_HSTS_ENABLED', 'false') === 'true',
};

// OIDC Configuration for Keycloak integration
export const OIDC_CONFIG = {
  ISSUER: getEnvVar('VITE_OIDC_ISSUER', '/auth/realms/mtn-admision'),
  CLIENT_ID: getEnvVar('VITE_OIDC_CLIENT_ID', 'web-guardianes'),
  CLIENT_SECRET: getEnvVar('VITE_OIDC_CLIENT_SECRET', ''),
  REDIRECT_URI: getEnvVar('VITE_OIDC_REDIRECT_URI', 'http://localhost:5173/callback'),
  POST_LOGOUT_REDIRECT_URI: getEnvVar('VITE_OIDC_POST_LOGOUT_REDIRECT_URI', 'http://localhost:5173/'),
  SCOPE: getEnvVar('VITE_OIDC_SCOPE', 'openid profile email roles'),
  RESPONSE_TYPE: getEnvVar('VITE_OIDC_RESPONSE_TYPE', 'code'),
  RESPONSE_MODE: getEnvVar('VITE_OIDC_RESPONSE_MODE', 'query'),
  
  // Admin client configuration
  ADMIN_CLIENT_ID: getEnvVar('VITE_OIDC_ADMIN_CLIENT_ID', 'web-admin'),
  ADMIN_REDIRECT_URI: getEnvVar('VITE_OIDC_ADMIN_REDIRECT_URI', 'http://localhost:5173/admin/callback'),
};

// Feature Flags
export const FEATURE_FLAGS = {
  EVALUATIONS: getEnvVar('VITE_FEATURE_EVALUATIONS', 'true') === 'true',
  INTERVIEWS: getEnvVar('VITE_FEATURE_INTERVIEWS', 'true') === 'true',
  RBAC_ENABLED: getEnvVar('VITE_FEATURE_RBAC_ENABLED', 'false') === 'true',
  MTLS_ENABLED: getEnvVar('VITE_FEATURE_MTLS_ENABLED', 'false') === 'true',
  RATE_LIMITING: getEnvVar('VITE_FEATURE_RATE_LIMITING', 'false') === 'true',
  OBSERVABILITY: getEnvVar('VITE_FEATURE_OBSERVABILITY', 'false') === 'true',
};

// Chilean specific configuration
export const CHILEAN_CONFIG = {
  TIMEZONE: getEnvVar('VITE_TIMEZONE', 'America/Santiago'),
  LOCALE: getEnvVar('VITE_LOCALE', 'es-CL'),
  CURRENCY: getEnvVar('VITE_CURRENCY', 'CLP'),
  DATE_FORMAT: getEnvVar('VITE_DATE_FORMAT', 'DD/MM/YYYY'),
  PHONE_FORMAT: getEnvVar('VITE_PHONE_FORMAT', '+56-9-XXXX-XXXX'),
  PII_PROTECTION: getEnvVar('VITE_PII_PROTECTION', 'false') === 'true',
  RUT_MASKING: getEnvVar('VITE_RUT_MASKING', 'false') === 'true',
  PRIVACY_LAW_COMPLIANCE: getEnvVar('VITE_CHILEAN_PRIVACY_LAW', 'false') === 'true',
};

// Observability Configuration
export const OBSERVABILITY_CONFIG = {
  OTEL_COLLECTOR_URL: getEnvVar('VITE_OTEL_COLLECTOR_URL', ''),
  GRAFANA_URL: getEnvVar('VITE_GRAFANA_URL', ''),
  JAEGER_URL: getEnvVar('VITE_JAEGER_URL', ''),
  PERFORMANCE_MONITORING: getEnvVar('VITE_ENABLE_PERFORMANCE_MONITORING', 'false') === 'true',
  AUDIT_LOGGING: getEnvVar('VITE_AUDIT_LOGGING', 'false') === 'true',
};

export const API_ENDPOINTS = {
  // Authentication - now through OIDC
  AUTH: '/auth',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  REGISTER: '/auth/register',
  VERIFY_EMAIL: '/auth/verify-email',
  OIDC_LOGIN: '/auth/oidc/login',
  OIDC_CALLBACK: '/auth/oidc/callback',
  
  // Applications
  APPLICATIONS: '/applications',
  MY_APPLICATIONS: '/applications/my-applications', 
  DASHBOARD_DATA: '/applications/dashboard-data',
  APPLICATION_SUBMIT: '/applications/submit',
  APPLICATION_STATUS: '/applications/{id}/status',
  
  // Documents
  DOCUMENTS: '/documents',
  DOCUMENT_STATUS: '/document-status',
  DOCUMENT_UPLOAD: '/documents/upload',
  DOCUMENT_DOWNLOAD: '/documents/{id}/download',
  
  // Evaluations
  EVALUATIONS: '/evaluations',
  MY_EVALUATIONS: '/evaluations/my-evaluations',
  PENDING_EVALUATIONS: '/evaluations/pending',
  EVALUATION_SUBMIT: '/evaluations/{id}/submit',
  EVALUATION_SCORES: '/evaluations/{id}/scores',
  
  // Interviews
  INTERVIEWS: '/interviews',
  SCHEDULE_INTERVIEW: '/interviews/schedule',
  INTERVIEW_AVAILABILITY: '/interviews/availability',
  INTERVIEW_CONFIRM: '/interviews/{id}/confirm',
  
  // Schedules
  SCHEDULES: '/schedules',
  FAMILY_SCHEDULES: '/schedules/family',
  EVALUATOR_SCHEDULES: '/schedules/evaluator', 
  CONFIRM_SCHEDULE: '/schedules/{id}/confirm',
  RESCHEDULE: '/schedules/{id}/reschedule',
  COMPLETE_SCHEDULE: '/schedules/{id}/complete',
  PENDING_CONFIRMATIONS: '/schedules/pending-confirmations',
  
  // Users
  USERS: '/users',
  SCHOOL_USERS: '/school-users',
  USER_PROFILE: '/users/me',
  USER_PERMISSIONS: '/users/me/permissions',
  
  // Admin endpoints
  ADMIN: {
    USERS: '/admin/users',
    APPLICATIONS: '/admin/applications',
    EVALUATIONS: '/admin/evaluations',
    REPORTS: '/admin/reports',
    STATISTICS: '/admin/statistics',
  },
  
  // Notifications
  NOTIFICATIONS: '/notifications',
  MARK_READ: '/notifications/{id}/read',
  
  // Health and monitoring
  HEALTH: '/actuator/health',
  INFO: '/actuator/info',
  METRICS: '/actuator/prometheus',
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  AUTHENTICATED_USER: 'authenticated_user',
  CURRENT_PROFESSOR: 'currentProfessor'
};

export const DEFAULT_CONFIG = {
  REQUEST_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};