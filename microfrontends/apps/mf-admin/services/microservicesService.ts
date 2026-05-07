import axios from 'axios';
import { getApiBaseUrl } from '../config/api.config';
import { extractBffList } from '../src/api/bffResponse';

/**
 * Servicio para conectar el frontend con la arquitectura de microservicios REAL
 * Este servicio se conecta directamente con nuestro API Gateway en funcionamiento
 */

// URLs base para arquitectura 100% microservicios - REAL API GATEWAY
const MICROSERVICES_GATEWAY_URL = getApiBaseUrl(); // Runtime detection: Vercel → Railway, local → localhost:8080
const GATEWAY_HEALTH_URL = `${MICROSERVICES_GATEWAY_URL}/health`;
const GATEWAY_STATUS_URL = `${MICROSERVICES_GATEWAY_URL}/gateway/status`;
const USER_SERVICE_URL = `${MICROSERVICES_GATEWAY_URL}/v1/users`; // A través del API Gateway
const APPLICATION_SERVICE_URL = `${MICROSERVICES_GATEWAY_URL}/v1/applications`;
const AUTH_SERVICE_URL = `${MICROSERVICES_GATEWAY_URL}/v1/auth`;

export interface MicroserviceStatus {
  service: string;
  status: 'UP' | 'DOWN';
  url: string;
  message: string;
  architecture: 'microservices';
}

export interface ServiceInfo {
  service: string;
  version: string;
  architecture: string;
  description: string;
  endpoints?: string[];
}

export interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
}

export class MicroservicesService {
  private static instance: MicroservicesService;
  private currentMode: 'microservices' = 'microservices';

  public static getInstance(): MicroservicesService {
    if (!MicroservicesService.instance) {
      MicroservicesService.instance = new MicroservicesService();
    }
    return MicroservicesService.instance;
  }

  /**
   * Detectar disponibilidad de microservicios
   */
  async detectArchitecture(): Promise<'microservices' | 'unavailable'> {
    try {
      console.log('Detectando microservicios reales disponibles...');
      
      const gatewayHealth = await this.checkGatewayHealth();
      const servicesHealth = await this.checkMicroservicesHealth();

      console.log('Estado de microservicios:', {
        gateway: gatewayHealth.status === 'UP' ? '' : '',
        servicios: servicesHealth.length > 0 ? '' : ''
      });

      return 'microservices';
    } catch (error) {
      console.error('Error detectando microservicios:', error);
      return 'unavailable';
    }
  }

  /**
   * Verificar salud del API Gateway REAL
   */
  async checkGatewayHealth(): Promise<MicroserviceStatus> {
    try {
      const response = await axios.get(GATEWAY_HEALTH_URL, { timeout: 5000 });
      return {
        service: 'api-gateway',
        status: 'UP',
        url: MICROSERVICES_GATEWAY_URL,
        message: response.data.status || 'Real API Gateway is running',
        architecture: 'microservices'
      };
    } catch (error) {
      throw {
        service: 'api-gateway',
        status: 'DOWN',
        url: MICROSERVICES_GATEWAY_URL,
        message: 'Real API Gateway is not available',
        architecture: 'microservices'
      };
    }
  }

  /**
   * Verificar salud de los microservicios REALES a través del Gateway
   */
  async checkMicroservicesHealth(): Promise<MicroserviceStatus[]> {
    const services = [
      { name: 'user-service', url: `${USER_SERVICE_URL}/health` },
      { name: 'application-service', url: `${APPLICATION_SERVICE_URL}/health` }
    ];

    const statuses: MicroserviceStatus[] = [];

    for (const service of services) {
      try {
        const response = await axios.get(service.url, { timeout: 5000 });
        statuses.push({
          service: service.name,
          status: 'UP',
          url: service.url,
          message: response.data.service || `${service.name} is running`,
          architecture: 'microservices'
        });
      } catch (error) {
        statuses.push({
          service: service.name,
          status: 'DOWN',
          url: service.url,
          message: `${service.name} is not available`,
          architecture: 'microservices'
        });
      }
    }

    return statuses;
  }

  /**
   * Obtener información de todos los servicios REALES
   */
  async getServicesInfo(): Promise<ServiceInfo[]> {
    const services: ServiceInfo[] = [];

    try {
      // Información del Gateway
      const gatewayResponse = await axios.get(GATEWAY_STATUS_URL, { timeout: 5000 });
      services.push({
        service: 'api-gateway',
        version: '1.0.0',
        architecture: 'microservices',
        description: 'Express API Gateway - Real implementation',
        endpoints: Object.keys(gatewayResponse.data.routes || {})
      });
    } catch (error) {
      console.warn('No se pudo obtener información del Gateway');
    }

    // Información de los microservicios individuales
    services.push({
      service: 'user-service',
      version: '1.0.0',
      architecture: 'microservices',
      description: 'User Management Microservice (Node.js)',
      endpoints: ['/v1/users', '/v1/auth', '/v1/users/health']
    });

    services.push({
      service: 'application-service',
      version: '1.0.0',
      architecture: 'microservices',
      description: 'Application Management Microservice (Node.js)',
      endpoints: ['/v1/applications', '/v1/applications/health']
    });

    return services;
  }

  /**
   * Obtener usuarios desde el microservicio REAL
   */
  async getUsersFromMicroservice(): Promise<UserData[]> {
    try {
      console.log('Obteniendo usuarios del microservicio real...');
      const response = await axios.get(USER_SERVICE_URL);
      
      if (response.data.success) {
        console.log('Usuarios obtenidos del microservicio:', response.data.data);
        return response.data.data;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error obteniendo usuarios del microservicio:', error);
      throw new Error('No se pudieron obtener usuarios del microservicio');
    }
  }

  /**
   * Obtener aplicaciones desde el microservicio REAL
   */
  async getApplicationsFromMicroservice(): Promise<any[]> {
    try {
      console.log('Obteniendo aplicaciones del microservicio real...');
      const response = await axios.get(APPLICATION_SERVICE_URL, { params: { size: 500, page: 0 } });
      const body = response.data;
      if (body?.success && Array.isArray(body.data)) {
        return body.data;
      }
      return extractBffList(body);
    } catch (error) {
      console.error('Error obteniendo aplicaciones del microservicio:', error);
      throw new Error('No se pudieron obtener aplicaciones del microservicio');
    }
  }

  /**
   * Probar conexión con microservicio REAL
   */
  async testMicroserviceConnection(data: any = {}): Promise<any> {
    try {
      console.log('🧪 Probando conexión con microservicio real...');
      
      // Test de usuarios
      const usersTest = await this.getUsersFromMicroservice();
      
      // Test de aplicaciones
      const applicationsTest = await this.getApplicationsFromMicroservice();
      
      // Test de gateway
      const gatewayTest = await axios.get(GATEWAY_STATUS_URL);
      
      const result = {
        gateway: gatewayTest.data,
        users: usersTest.slice(0, 2), // Mostrar solo 2 usuarios como ejemplo
        applications: applicationsTest.slice(0, 2), // Mostrar solo 2 aplicaciones como ejemplo
        timestamp: new Date().toISOString(),
        from: 'frontend',
        testData: 'Real microservices integration test'
      };
      
      console.log('Conexión con microservicios reales exitosa:', result);
      return result;
    } catch (error) {
      console.error('Error en conexión con microservicios reales:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas del microservicio REAL
   */
  async getMicroserviceStats(): Promise<any> {
    try {
      console.log('Obteniendo estadísticas de microservicios reales...');
      
      const [users, applications] = await Promise.all([
        this.getUsersFromMicroservice(),
        this.getApplicationsFromMicroservice()
      ]);

      const stats = {
        totalUsers: users.length,
        totalApplications: applications.length,
        usersByRole: users.reduce((acc: any, user: UserData) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {}),
        applicationsByStatus: applications.reduce((acc: any, app: any) => {
          acc[app.status] = (acc[app.status] || 0) + 1;
          return acc;
        }, {}),
        timestamp: new Date().toISOString(),
        source: 'real-microservices'
      };

      console.log('Estadísticas obtenidas:', stats);
      return stats;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  /**
   * Obtener dashboard completo de microservicios REALES
   */
  async getServicesDashboard(): Promise<{
    services: MicroserviceStatus[];
    architecture: string;
    recommendations: string[];
  }> {
    try {
      console.log('Obteniendo dashboard de microservicios reales...');
      
      const gateway = await this.checkGatewayHealth();
      const services = await this.checkMicroservicesHealth();
      
      const allServices = [gateway, ...services];
      
      const recommendations = [
        'Sistema funcionando 100% con microservicios',
        'Monolito eliminado completamente',
        'API Gateway activo y funcionando',
        'Bases de datos segregadas por servicio',
        'Frontend integrado correctamente'
      ];

      return {
        services: allServices,
        architecture: '100% Microservicios (Real)',
        recommendations
      };
    } catch (error) {
      console.error('Error obteniendo dashboard:', error);
      return {
        services: [],
        architecture: 'Error',
        recommendations: ['Error conectando con microservicios']
      };
    }
  }

  /**
   * Obtener modo actual (para compatibilidad con componentes existentes)
   */
  getCurrentMode(): string {
    return this.currentMode;
  }

  /**
   * Obtener URL base (para compatibilidad con componentes existentes)
   */
  getBaseUrl(): string {
    return MICROSERVICES_GATEWAY_URL;
  }
}

// Exportar instancia singleton
export const microservicesService = MicroservicesService.getInstance();