export type DomainName =
  | 'auth'
  | 'admissions'
  | 'student'
  | 'guardian'
  | 'evaluations'
  | 'interviews'
  | 'reports'
  | 'admin'
  | 'coordinator'
  | 'shared';

export type UserRole =
  | 'APODERADO'
  | 'ADMIN'
  | 'TEACHER'
  | 'COORDINATOR'
  | 'CYCLE_DIRECTOR'
  | 'PSYCHOLOGIST'
  | 'TEACHER_LANGUAGE'
  | 'TEACHER_MATHEMATICS'
  | 'TEACHER_ENGLISH';

export interface AuthSession {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  token?: string;
}

export interface BackendEndpointMap {
  bff: string;
  auth?: string;
  documents?: string;
  notifications?: string;
}

export interface RuntimeConfig {
  appName: string;
  domain: DomainName;
  basePath: string;
  backend: BackendEndpointMap;
}

export interface NavItem {
  label: string;
  to: string;
  roles?: UserRole[];
}

export interface RemoteRouteDefinition {
  path: string;
  remote: string;
  module: string;
  roles?: UserRole[];
}

export interface RemoteDefinition {
  name: string;
  domain: DomainName;
  entry: string;
  basePath: string;
  routes: RemoteRouteDefinition[];
  nav?: NavItem[];
}

export interface ShellManifest {
  shell: RuntimeConfig;
  remotes: RemoteDefinition[];
}

export interface DomainCapability {
  key: string;
  description: string;
}

export interface DomainApiBinding {
  service: string;
  responsibilities: string[];
  endpoints: string[];
}

export interface DomainOwnership {
  domain: DomainName;
  displayName: string;
  roles: UserRole[];
  routes: string[];
  capabilities: DomainCapability[];
  apis: DomainApiBinding[];
}
