import axios from 'axios';
import httpClient from './http';

// httpClient handles base URL resolution and auth token injection automatically

// Types for the interviewer schedule system
export interface InterviewerSchedule {
    id?: number;
    interviewer: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
    };
    dayOfWeek?: string; // For recurring schedules
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
    year: number;
    specificDate?: string; // YYYY-MM-DD format for specific dates
    scheduleType: 'RECURRING' | 'SPECIFIC_DATE' | 'EXCEPTION';
    isActive: boolean;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface RecurringScheduleRequest {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    notes?: string;
}

export interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    educationalLevel?: string;
    subject?: string;
}

export interface InterviewAvailabilityResponse {
    date: string;
    time: string;
    availableInterviewers: User[];
    count: number;
    message: string;
}

export interface InterviewAvailabilityByTypeResponse {
    interviewType: string;
    date: string;
    time: string;
    availableInterviewers: User[];
    count: number;
    message: string;
}

export interface AvailabilitySummary {
    date: string;
    timeSlots: {
        time: string;
        availableCount: number;
        availableInterviewers: {
            id: number;
            name: string;
            role: string;
        }[];
    }[];
    message: string;
}

// Main service class
export class InterviewerScheduleService {
    private static instance: InterviewerScheduleService;
    public static getInstance(): InterviewerScheduleService {
        if (!InterviewerScheduleService.instance) {
            InterviewerScheduleService.instance = new InterviewerScheduleService();
        }
        return InterviewerScheduleService.instance;
    }

    // CRUD operations for schedules

    /**
     * Create a new schedule for an interviewer
     */
    async createSchedule(schedule: Omit<InterviewerSchedule, 'id'>): Promise<InterviewerSchedule> {
        try {
            return await httpClient.post('/v1/interviewer-schedules', schedule);
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ?
                error.response?.data?.message || 'Error al crear horario' :
                'Error al crear horario');
        }
    }

    /**
     * Update an existing schedule
     */
    async updateSchedule(scheduleId: number, schedule: Partial<InterviewerSchedule>): Promise<InterviewerSchedule> {
        try {
            return await httpClient.put(`/v1/interviewer-schedules/${scheduleId}`, schedule);
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ?
                error.response?.data?.message || 'Error al actualizar horario' :
                'Error al actualizar horario');
        }
    }

    /**
     * Deactivate a schedule (soft delete)
     */
    async deactivateSchedule(scheduleId: number): Promise<void> {
        try {
            await httpClient.put(`/v1/interviewer-schedules/${scheduleId}/deactivate`, {});
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ?
                error.response?.data?.message || 'Error al desactivar horario' :
                'Error al desactivar horario');
        }
    }

    /**
     * Delete a schedule permanently
     */
    async deleteSchedule(scheduleId: number): Promise<void> {
        try {
            await httpClient.delete(`/v1/interviewer-schedules/${scheduleId}`);
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ?
                error.response?.data?.message || 'Error al eliminar horario' :
                'Error al eliminar horario');
        }
    }

    /**
     * Get schedule by ID
     */
    async getScheduleById(scheduleId: number): Promise<InterviewerSchedule> {
        try {
            return await httpClient.get(`/v1/interviewer-schedules/${scheduleId}`);
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ? 
                error.response?.data?.message || 'Error al obtener horario' : 
                'Error al obtener horario');
        }
    }

    /**
     * Get all schedules for an interviewer
     */
    async getInterviewerSchedules(interviewerId: number): Promise<InterviewerSchedule[]> {
        try {
            return await httpClient.get(`/v1/interviewer-schedules/interviewer/${interviewerId}`);
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ? 
                error.response?.data?.message || 'Error al obtener horarios del entrevistador' : 
                'Error al obtener horarios del entrevistador');
        }
    }

    /**
     * Get schedules for an interviewer by year
     */
    async getInterviewerSchedulesByYear(interviewerId: number, year: number): Promise<InterviewerSchedule[]> {
        try {
            return await httpClient.get(`/v1/interviewer-schedules/interviewer/${interviewerId}/year/${year}`);
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ? 
                error.response?.data?.message || 'Error al obtener horarios por año' : 
                'Error al obtener horarios por año');
        }
    }

    // Availability checking methods

    /**
     * Get available interviewers for a specific date and time
     */
    async getAvailableInterviewers(date: string, time: string): Promise<InterviewAvailabilityResponse> {
        try {
            return await httpClient.get(`/v1/interviews/availability/interviewers`, {
                params: { date, time }
            });
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ? 
                error.response?.data?.message || 'Error al obtener entrevistadores disponibles' : 
                'Error al obtener entrevistadores disponibles');
        }
    }

    /**
     * Find available interviewers using the correct backend endpoint
     */
    async findAvailableInterviewers(date: string, time: string): Promise<User[]> {
        try {
            // Use the public endpoint with date and time parameters for real availability check
            const data = await httpClient.get(`/v1/interviews/public/interviewers`, {
                params: {
                    date: date,
                    time: time
                }
            });
            
            // The backend returns interviewers with their basic info
            // Transform to match the User interface expected by the frontend
            return data.map((interviewer: any) => ({
                id: interviewer.id,
                firstName: interviewer.name.split(' ')[0] || '',
                lastName: interviewer.name.split(' ').slice(1).join(' ') || '',
                email: `${interviewer.name.toLowerCase().replace(/\s+/g, '.')}@mtn.cl`, // Generate email for display
                role: interviewer.role,
                educationalLevel: interviewer.educationalLevel,
                subject: interviewer.subject
            }));
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ? 
                error.response?.data?.message || 'Error al buscar entrevistadores disponibles' : 
                'Error al buscar entrevistadores disponibles');
        }
    }

    /**
     * Get available interviewers filtered by interview type
     */
    async getAvailableInterviewersByType(interviewType: string, date: string, time: string): Promise<InterviewAvailabilityByTypeResponse> {
        try {
            return await httpClient.get(`/v1/interviews/availability/interviewers/by-type`, {
                params: { interviewType, date, time }
            });
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ? 
                error.response?.data?.message || 'Error al obtener entrevistadores por tipo' : 
                'Error al obtener entrevistadores por tipo');
        }
    }

    /**
     * Check if specific interviewer is available
     */
    async checkInterviewerAvailability(interviewerId: number, date: string, time: string): Promise<{
        interviewerId: number;
        date: string;
        time: string;
        available: boolean;
    }> {
        try {
            return await httpClient.get(`/v1/interviewer-schedules/interviewer/${interviewerId}/availability`, {
                params: { date, time }
            });
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ? 
                error.response?.data?.message || 'Error al verificar disponibilidad' : 
                'Error al verificar disponibilidad');
        }
    }

    /**
     * Get availability summary for a specific date
     */
    async getAvailabilitySummary(date: string): Promise<AvailabilitySummary> {
        try {
            return await httpClient.get(`/v1/interviews/availability/summary`, {
                params: { date }
            });
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ? 
                error.response?.data?.message || 'Error al obtener resumen de disponibilidad' : 
                'Error al obtener resumen de disponibilidad');
        }
    }

    // Bulk operations

    /**
     * Create multiple recurring schedules
     */
    async createRecurringSchedules(interviewerId: number, year: number, schedules: RecurringScheduleRequest[]): Promise<InterviewerSchedule[]> {
        try {
            return await httpClient.post(`/v1/interviewer-schedules/interviewer/${interviewerId}/recurring/${year}`, schedules);
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ?
                error.response?.data?.message || 'Error al crear horarios recurrentes' :
                'Error al crear horarios recurrentes');
        }
    }

    /**
     * Create exception (unavailable day)
     */
    async createException(interviewerId: number, date: string, notes?: string): Promise<InterviewerSchedule> {
        try {
            const url = `/v1/interviewer-schedules/interviewer/${interviewerId}/exception?date=${date}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}`;
            return await httpClient.post(url, {});
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ?
                error.response?.data?.message || 'Error al crear excepción' :
                'Error al crear excepción');
        }
    }

    /**
     * Copy schedules from one year to another
     */
    async copySchedulesToYear(interviewerId: number, fromYear: number, toYear: number): Promise<InterviewerSchedule[]> {
        try {
            const url = `/v1/interviewer-schedules/interviewer/${interviewerId}/copy-schedules?fromYear=${fromYear}&toYear=${toYear}`;
            return await httpClient.post(url, {});
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ?
                error.response?.data?.message || 'Error al copiar horarios' :
                'Error al copiar horarios');
        }
    }

    // Statistics and reports

    /**
     * Get workload statistics
     */
    async getWorkloadStatistics(year: number): Promise<any[]> {
        try {
            return await httpClient.get(`/v1/interviewer-schedules/statistics/workload/${year}`);
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ? 
                error.response?.data?.message || 'Error al obtener estadísticas' : 
                'Error al obtener estadísticas');
        }
    }

    /**
     * Get interviewers with configured schedules
     */
    async getInterviewersWithSchedules(year: number): Promise<User[]> {
        try {
            return await httpClient.get(`/v1/interviewer-schedules/interviewers-with-schedules/${year}`);
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ? 
                error.response?.data?.message || 'Error al obtener entrevistadores con horarios' : 
                'Error al obtener entrevistadores con horarios');
        }
    }

    /**
     * Health check for the service
     */
    async healthCheck(): Promise<{ status: string; service: string; timestamp: string; }> {
        try {
            return await httpClient.get(`/v1/interviewer-schedules/health`);
        } catch (error) {
            throw new Error('Service unavailable');
        }
    }

    /**
     * Test availability system
     */
    async testAvailabilitySystem(): Promise<any> {
        try {
            return await httpClient.get(`/v1/interviews/availability/test`);
        } catch (error) {
            throw new Error(axios.isAxiosError(error) ? 
                error.response?.data?.message || 'Error al probar sistema' : 
                'Error al probar sistema');
        }
    }
}

// Singleton instance
export const interviewerScheduleService = InterviewerScheduleService.getInstance();

// Utility functions
export const formatScheduleTime = (time: string): string => {
    // Convert HH:mm to display format
    return time;
};

export const formatScheduleDate = (date: string): string => {
    // Format date for display
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

export const getDayOfWeekOptions = () => [
    { value: 'MONDAY', label: 'Lunes' },
    { value: 'TUESDAY', label: 'Martes' },
    { value: 'WEDNESDAY', label: 'Miércoles' },
    { value: 'THURSDAY', label: 'Jueves' },
    { value: 'FRIDAY', label: 'Viernes' },
    { value: 'SATURDAY', label: 'Sábado' },
    { value: 'SUNDAY', label: 'Domingo' }
];

export const getScheduleTypeOptions = () => [
    { value: 'RECURRING', label: 'Horario Recurrente' },
    { value: 'SPECIFIC_DATE', label: 'Fecha Específica' },
    { value: 'EXCEPTION', label: 'Excepción (No disponible)' }
];

export const getTimeSlotOptions = () => {
    const slots = [];
    // Generate 18 slots from 08:00 to 17:00 (every 30 minutes)
    for (let hour = 8; hour <= 17; hour++) {
        for (let minute of [0, 30]) {
            // Skip 17:30 to end exactly at 17:00
            if (hour === 17 && minute === 30) break;

            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const displayTime = `${hour}:${minute === 0 ? '00' : '30'}`;
            slots.push({ value: time, label: displayTime });
        }
    }
    // Should return exactly 18 slots: 08:00, 08:30, 09:00, ..., 16:30, 17:00
    return slots;
};