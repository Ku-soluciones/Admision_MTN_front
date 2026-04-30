import React from 'react';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  UserStats as UserStatsType,
  UserStatsProps,
  USER_ROLE_LABELS,
  UserRole
} from '../../types/user';
import {
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  UserGroupIcon
} from '../icons/Icons';

const UserStats: React.FC<UserStatsProps> = ({
  stats,
  isLoading = false,
  className = ''
}) => {
  
  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center justify-center">
              <LoadingSpinner size="md" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const getStatCards = () => [
    {
      title: 'Total de Usuarios',
      value: stats.totalUsers,
      icon: UsersIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Usuarios en el sistema'
    },
    {
      title: 'Usuarios Activos',
      value: stats.activeUsers,
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Usuarios habilitados',
      percentage: stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0
    },
    {
      title: 'Usuarios Inactivos',
      value: stats.inactiveUsers,
      icon: XCircleIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: 'Usuarios deshabilitados',
      percentage: stats.totalUsers > 0 ? Math.round((stats.inactiveUsers / stats.totalUsers) * 100) : 0
    },
    {
      title: 'Emails Verificados',
      value: stats.verifiedUsers,
      icon: ShieldCheckIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Usuarios con email verificado',
      percentage: stats.totalUsers > 0 ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) : 0
    }
  ];

  const getRoleStats = () => {
    const roleOrder = [
      UserRole.ADMIN,
      UserRole.CYCLE_DIRECTOR,
      UserRole.PSYCHOLOGIST,
      UserRole.TEACHER_LANGUAGE,
      UserRole.TEACHER_MATHEMATICS,
      UserRole.TEACHER_ENGLISH,
      UserRole.APODERADO
    ];

    return roleOrder
      .map(role => ({
        role,
        label: USER_ROLE_LABELS[role],
        count: stats.roleStats[role] || 0,
        icon: getRoleIcon(role)
      }))
      .filter(item => item.count > 0);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return ShieldCheckIcon;
      case UserRole.CYCLE_DIRECTOR:
        return UserGroupIcon;
      case UserRole.PSYCHOLOGIST:
        return AcademicCapIcon;
      case UserRole.TEACHER_LANGUAGE:
      case UserRole.TEACHER_MATHEMATICS:
      case UserRole.TEACHER_ENGLISH:
        return AcademicCapIcon;
      case UserRole.APODERADO:
        return UsersIcon;
      default:
        return UsersIcon;
    }
  };

  const getRoleColor = (role: UserRole): { text: string; bg: string } => {
    switch (role) {
      case UserRole.ADMIN:
        return { text: 'text-red-600', bg: 'bg-red-100' };
      case UserRole.CYCLE_DIRECTOR:
        return { text: 'text-blue-600', bg: 'bg-blue-100' };
      case UserRole.PSYCHOLOGIST:
        return { text: 'text-orange-600', bg: 'bg-orange-100' };
      case UserRole.TEACHER_LANGUAGE:
      case UserRole.TEACHER_MATHEMATICS:
      case UserRole.TEACHER_ENGLISH:
        return { text: 'text-indigo-600', bg: 'bg-indigo-100' };
      case UserRole.APODERADO:
        return { text: 'text-green-600', bg: 'bg-green-100' };
      default:
        return { text: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {getStatCards().map((stat, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 ${stat.bgColor} rounded-lg p-3`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  {stat.percentage !== undefined && (
                    <p className="ml-2 text-sm text-gray-500">({stat.percentage}%)</p>
                  )}
                </div>
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Estadísticas por rol */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Distribución por Roles
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getRoleStats().map((roleStat) => {
            const colors = getRoleColor(roleStat.role);
            const percentage = stats.totalUsers > 0 ? Math.round((roleStat.count / stats.totalUsers) * 100) : 0;
            
            return (
              <div
                key={roleStat.role}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className={`${colors.bg} rounded-lg p-2`}>
                    <roleStat.icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {roleStat.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {percentage}% del total
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {roleStat.count}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {getRoleStats().length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <UsersIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No hay datos de roles disponibles</p>
          </div>
        )}
      </Card>

      {/* Resumen adicional */}
      <Card className="p-6 bg-gradient-to-r from-azul-monte-tabor to-blue-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium mb-2">Resumen General</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="opacity-90">Usuarios sin verificar:</p>
                <p className="text-xl font-semibold">{stats.unverifiedUsers}</p>
              </div>
              <div>
                <p className="opacity-90">Tasa de activación:</p>
                <p className="text-xl font-semibold">
                  {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <UsersIcon className="w-16 h-16 opacity-20" />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default UserStats;