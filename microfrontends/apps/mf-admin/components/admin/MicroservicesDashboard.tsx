import React, { useState, useEffect } from 'react';
import { microservicesService, MicroserviceStatus, ServiceInfo, UserData } from '../../services/microservicesService';

interface MicroservicesDashboardProps {
  className?: string;
}

const MicroservicesDashboard: React.FC<MicroservicesDashboardProps> = ({ className = '' }) => {
  const [services, setServices] = useState<MicroserviceStatus[]>([]);
  const [servicesInfo, setServicesInfo] = useState<ServiceInfo[]>([]);
  const [architecture, setArchitecture] = useState<string>('detecting...');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [microserviceUsers, setMicroserviceUsers] = useState<UserData[]>([]);
  const [testConnection, setTestConnection] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Cargando dashboard de microservicios...');

      // Obtener estado de servicios
      const dashboard = await microservicesService.getServicesDashboard();
      setServices(dashboard.services);
      setArchitecture(dashboard.architecture);
      setRecommendations(dashboard.recommendations);

      // Obtener información de servicios
      const info = await microservicesService.getServicesInfo();
      setServicesInfo(info);

      console.log('✅ Dashboard cargado correctamente');
    } catch (err: any) {
      console.error('❌ Error cargando dashboard:', err);
      setError(err.message || 'Error cargando dashboard de microservicios');
    } finally {
      setLoading(false);
    }
  };

  const testMicroservice = async () => {
    try {
      console.log('🧪 Probando microservicio...');
      
      // Probar conexión
      const connectionTest = await microservicesService.testMicroserviceConnection({
        frontend: 'React Admin Dashboard',
        test: 'Integration test'
      });
      setTestConnection(connectionTest);

      // Obtener usuarios
      const users = await microservicesService.getUsersFromMicroservice();
      setMicroserviceUsers(users);

      // Obtener estadísticas
      const serviceStats = await microservicesService.getMicroserviceStats();
      setStats(serviceStats);

      console.log('✅ Prueba de microservicio completada');
    } catch (err: any) {
      console.error('❌ Error probando microservicio:', err);
      setError(err.message || 'Error probando microservicio');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UP': return 'text-green-600 bg-green-100';
      case 'DOWN': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getArchitectureColor = (arch: string) => {
    switch (arch) {
      case 'microservices': return 'text-blue-600 bg-blue-100';
      case 'monolith': return 'text-purple-600 bg-purple-100';
      case 'both': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className={`p-6 bg-white rounded-lg shadow-md ${className}`}>
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Detectando arquitectura...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🏗️ Dashboard de Microservicios</h2>
          <p className="text-gray-600">Estado y control de la arquitectura del sistema</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Actualizar
          </button>
          <button
            onClick={testMicroservice}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            🧪 Probar Microservicio
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">❌ {error}</p>
        </div>
      )}

      {/* Architecture Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Arquitectura Detectada</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getArchitectureColor(architecture)}`}>
          {architecture.toUpperCase()}
        </span>
      </div>

      {/* Services Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Estado de Servicios</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {services.map((service, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-800">{service.service}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                  {service.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{service.message}</p>
              <div className="text-xs text-gray-500">
                <p>URL: {service.url}</p>
                <p>Arquitectura: {service.architecture}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Services Info */}
      {servicesInfo.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Información de Servicios</h3>
          <div className="space-y-4">
            {servicesInfo.map((info, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-medium text-gray-800">{info.service}</h4>
                  <span className="text-sm text-gray-500">v{info.version}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getArchitectureColor(info.architecture)}`}>
                    {info.architecture}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{info.description}</p>
                {info.endpoints && (
                  <div className="text-xs text-gray-500">
                    <p className="font-medium">Endpoints disponibles:</p>
                    <ul className="mt-1 space-y-1">
                      {info.endpoints.map((endpoint, i) => (
                        <li key={i} className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {endpoint}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Results */}
      {testConnection && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Prueba de Conexión Exitosa</h3>
          <div className="text-sm text-green-700">
            <p><strong>Estado:</strong> {testConnection.status}</p>
            <p><strong>Mensaje:</strong> {testConnection.message}</p>
            <p><strong>Servicio:</strong> {testConnection.service}</p>
            <p><strong>Timestamp:</strong> {testConnection.timestamp}</p>
          </div>
        </div>
      )}

      {/* Microservice Users */}
      {microserviceUsers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">👥 Usuarios del Microservicio</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid md:grid-cols-3 gap-3">
              {microserviceUsers.map((user, index) => (
                <div key={index} className="bg-white p-3 rounded border">
                  <p className="font-medium text-gray-800">{user.name}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <p className="text-xs text-blue-600">{user.role} - {user.service}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Estadísticas del Microservicio</h3>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats?.totalUsers || 0}</div>
                <div className="text-sm text-gray-600">Usuarios Totales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats?.activeUsers || 0}</div>
                <div className="text-sm text-gray-600">Usuarios Activos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats?.roles?.length || 0}</div>
                <div className="text-sm text-gray-600">Roles Disponibles</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Base de Datos:</strong> {stats?.database || 'N/A'}</p>
              <p><strong>Arquitectura:</strong> {stats?.architecture || 'N/A'}</p>
              <p><strong>Uptime:</strong> {stats?.serviceUptime || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">💡 Recomendaciones</h3>
          <div className="space-y-2">
            {recommendations.map((rec, index) => (
              <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Mode */}
      <div className="text-center text-sm text-gray-500">
        Modo actual: <strong>{microservicesService.getCurrentMode()}</strong>
        {' | '}
        URL base: <code className="bg-gray-100 px-2 py-1 rounded">{microservicesService.getBaseUrl()}</code>
      </div>
    </div>
  );
};

export default MicroservicesDashboard;