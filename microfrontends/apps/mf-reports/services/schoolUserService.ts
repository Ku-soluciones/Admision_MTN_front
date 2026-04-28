import { CreateUserRequest, User, UserRole } from '../types/user';
import { Professor, KinderTeacher, Psychologist, SupportStaff } from '../types';
import api from './api';

const SCHOOL_USERS_ENDPOINT = '/v1/school-users';

export interface SchoolUserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  professors: number;
  kinderTeachers: number;
  psychologists: number;
  supportStaff: number;
}

class SchoolUserService {

  async createUser(userData: CreateUserRequest): Promise<User> {
    
    const requestBody = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      password: userData.password,
      role: userData.role,
      phone: userData.phone,
      
      // Campos específicos por rol
      ...(userData.role === UserRole.PROFESSOR && {
        subjects: userData.subjects,
        assignedGrades: userData.assignedGrades,
        department: userData.department,
        yearsOfExperience: userData.yearsOfExperience,
        qualifications: userData.qualifications
      }),
      
      ...(userData.role === UserRole.KINDER_TEACHER && {
        assignedLevel: userData.assignedLevel,
        specializations: userData.specializations,
        yearsOfExperience: userData.yearsOfExperience,
        qualifications: userData.qualifications
      }),
      
      ...(userData.role === UserRole.PSYCHOLOGIST && {
        specialty: userData.specialty,
        licenseNumber: userData.licenseNumber,
        assignedGrades: userData.assignedGrades,
        canConductInterviews: userData.canConductInterviews,
        canPerformPsychologicalEvaluations: userData.canPerformPsychologicalEvaluations,
        specializedAreas: userData.specializedAreas
      }),
      
      ...(userData.role === UserRole.SUPPORT_STAFF && {
        staffType: userData.staffType,
        department: userData.department,
        responsibilities: userData.responsibilities,
        canAccessReports: userData.canAccessReports,
        canManageSchedules: userData.canManageSchedules
      })
    };


    try {
      const response = await api.post(SCHOOL_USERS_ENDPOINT, requestBody);
      
      return this.convertBackendUserToFrontendUser(response.data);
    } catch (error) {
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    const response = await api.get(SCHOOL_USERS_ENDPOINT);
    return response.data.map((userData: any) => this.convertBackendUserToFrontendUser(userData));
  }

  private convertBackendUserToFrontendUser(userData: any): User {
    const baseUser = {
      id: userData.id.toString(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      role: userData.role,
      isActive: userData.active,
      createdAt: userData.fechaRegistro,
      updatedAt: userData.updatedAt,
      phone: userData.phone,
      password: ''
    };
    
    // Crear el usuario con los campos específicos según el rol
    switch (userData.role) {
      case UserRole.PROFESSOR:
        return {
          ...baseUser,
          role: UserRole.PROFESSOR,
          subjects: userData.subjects || [],
          assignedGrades: userData.assignedGrades || [],
          department: userData.department || '',
          isAdmin: userData.isAdmin || false,
          yearsOfExperience: userData.yearsOfExperience,
          qualifications: userData.qualifications || []
        } as Professor;
        
      case UserRole.KINDER_TEACHER:
        return {
          ...baseUser,
          role: UserRole.KINDER_TEACHER,
          assignedLevel: userData.assignedLevel || 'kinder',
          specializations: userData.specializations || [],
          yearsOfExperience: userData.yearsOfExperience,
          qualifications: userData.qualifications || []
        } as KinderTeacher;
        
      case UserRole.PSYCHOLOGIST:
        return {
          ...baseUser,
          role: UserRole.PSYCHOLOGIST,
          specialty: userData.specialty,
          licenseNumber: userData.licenseNumber || '',
          assignedGrades: userData.assignedGrades || [],
          canConductInterviews: userData.canConductInterviews || false,
          canPerformPsychologicalEvaluations: userData.canPerformPsychologicalEvaluations || false,
          specializedAreas: userData.specializedAreas || []
        } as Psychologist;
        
      case UserRole.SUPPORT_STAFF:
        return {
          ...baseUser,
          role: UserRole.SUPPORT_STAFF,
          staffType: userData.staffType,
          department: userData.department || '',
          responsibilities: userData.responsibilities || [],
          canAccessReports: userData.canAccessReports || false,
          canManageSchedules: userData.canManageSchedules || false
        } as SupportStaff;
        
      default:
        throw new Error(`Rol no soportado: ${userData.role}`);
    }
  }

  async getActiveUsers(): Promise<User[]> {
    const response = await api.get(`${SCHOOL_USERS_ENDPOINT}/active`);
    return response.data.map((userData: any) => this.convertBackendUserToFrontendUser(userData));
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    const response = await api.get(`${SCHOOL_USERS_ENDPOINT}/by-role/${role}`);
    return response.data.map((userData: any) => this.convertBackendUserToFrontendUser(userData));
  }

  async getUserById(id: string): Promise<User> {
    const response = await api.get(`${SCHOOL_USERS_ENDPOINT}/${id}`);
    return this.convertBackendUserToFrontendUser(response.data);
  }

  async updateUser(id: string, userData: CreateUserRequest): Promise<User> {
    const requestBody = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      
      // Campos específicos por rol
      ...(userData.role === UserRole.PROFESSOR && {
        subjects: userData.subjects,
        assignedGrades: userData.assignedGrades,
        department: userData.department,
        yearsOfExperience: userData.yearsOfExperience,
        qualifications: userData.qualifications
      }),
      
      ...(userData.role === UserRole.KINDER_TEACHER && {
        assignedLevel: userData.assignedLevel,
        specializations: userData.specializations,
        yearsOfExperience: userData.yearsOfExperience,
        qualifications: userData.qualifications
      }),
      
      ...(userData.role === UserRole.PSYCHOLOGIST && {
        specialty: userData.specialty,
        licenseNumber: userData.licenseNumber,
        assignedGrades: userData.assignedGrades,
        canConductInterviews: userData.canConductInterviews,
        canPerformPsychologicalEvaluations: userData.canPerformPsychologicalEvaluations,
        specializedAreas: userData.specializedAreas
      }),
      
      ...(userData.role === UserRole.SUPPORT_STAFF && {
        staffType: userData.staffType,
        department: userData.department,
        responsibilities: userData.responsibilities,
        canAccessReports: userData.canAccessReports,
        canManageSchedules: userData.canManageSchedules
      })
    };

    const response = await api.put(`${SCHOOL_USERS_ENDPOINT}/${id}`, requestBody);
    return this.convertBackendUserToFrontendUser(response.data);
  }

  async deactivateUser(id: string): Promise<{ message: string }> {
    const response = await api.patch(`${SCHOOL_USERS_ENDPOINT}/${id}/deactivate`);
    return response.data;
  }

  async reactivateUser(id: string): Promise<{ message: string }> {
    const response = await api.patch(`${SCHOOL_USERS_ENDPOINT}/${id}/reactivate`);
    return response.data;
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    const response = await api.delete(`${SCHOOL_USERS_ENDPOINT}/${id}`);
    return response.data;
  }

  async updateSubjectsMapping(): Promise<void> {
    try {
      await api.post('/v1/school-users/update-subjects-mapping');
    } catch (error) {
      throw error;
    }
  }

  async getProfessors(): Promise<User[]> {
    return this.getUsersByRole(UserRole.PROFESSOR);
  }

  async getKinderTeachers(): Promise<User[]> {
    return this.getUsersByRole(UserRole.KINDER_TEACHER);
  }

  async getPsychologists(): Promise<User[]> {
    return this.getUsersByRole(UserRole.PSYCHOLOGIST);
  }

  async getSupportStaff(): Promise<User[]> {
    return this.getUsersByRole(UserRole.SUPPORT_STAFF);
  }

  async getStats(): Promise<SchoolUserStats> {
    const response = await api.get(`${SCHOOL_USERS_ENDPOINT}/stats`);
    return response.data;
  }
}

export const schoolUserService = new SchoolUserService();