/**
 * Interview Workflow Service - Cycle Directors Gateway Integration
 * Handles interview scheduling, confirmation, and completion through API Gateway
 */

import httpClient from './http';
import { Interview, InterviewSearchParams } from '../src/api/interviews.types';

export interface InterviewSchedulingRequest {
  applicationId: number;
  interviewerId: number;
  scheduledDate: string;
  duration: number; // minutes
  location: string;
  type: 'FAMILY' | 'STUDENT' | 'BOTH' | 'DIRECTOR';
  interviewMode: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID';
  participants: Array<{
    role: 'STUDENT' | 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'SUPPORTER';
    name: string;
    email?: string;
    phone?: string;
    required: boolean;
  }>;
  preparation?: {
    materialsNeeded: string[];
    preInterviewInstructions: string;
    documentsToReview: string[];
  };
  notes?: string;
}

export interface InterviewAvailability {
  interviewerId: number;
  interviewerName: string;
  role: string;
  specializations: string[];
  availability: Array<{
    date: string;
    timeSlots: Array<{
      startTime: string;
      endTime: string;
      duration: number;
      location: string;
      mode: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID';
      available: boolean;
      conflictReason?: string;
    }>;
  }>;
  workload: {
    currentInterviews: number;
    maxDailyCapacity: number;
    maxWeeklyCapacity: number;
    nextAvailableSlot: string;
  };
}

export interface InterviewConfirmation {
  interviewId: number;
  confirmationCode: string;
  participants: Array<{
    role: string;
    name: string;
    email: string;
    confirmationStatus: 'PENDING' | 'CONFIRMED' | 'DECLINED';
    confirmationDate?: string;
    responseNotes?: string;
  }>;
  scheduledDate: string;
  location: string;
  virtualMeetingInfo?: {
    platform: 'ZOOM' | 'TEAMS' | 'MEET' | 'WEBEX';
    meetingId: string;
    meetingUrl: string;
    password?: string;
    dialInNumbers?: string[];
  };
  preparation: {
    instructions: string[];
    documentsToBring: string[];
    estimatedDuration: string;
    contactInformation: {
      interviewer: string;
      phone: string;
      email: string;
    };
  };
}

export interface InterviewRescheduling {
  interviewId: number;
  currentDate: string;
  newDate: string;
  reason: 'INTERVIEWER_CONFLICT' | 'FAMILY_REQUEST' | 'FACILITY_UNAVAILABLE' | 'EMERGENCY' | 'OTHER';
  initiatedBy: 'INTERVIEWER' | 'FAMILY' | 'ADMIN';
  notes?: string;
  alternativeDates?: string[];
  requiresApproval: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface InterviewCompletion {
  interviewId: number;
  actualStartTime: string;
  actualEndTime: string;
  actualDuration: number;
  attendees: Array<{
    role: string;
    name: string;
    attended: boolean;
    arrivalTime?: string;
    departureTime?: string;
  }>;
  interviewOutcome: {
    overallImpression: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'NEEDS_IMPROVEMENT' | 'CONCERNING';
    recommendation: 'STRONG_RECOMMEND' | 'RECOMMEND' | 'NEUTRAL' | 'CONCERNS' | 'DO_NOT_RECOMMEND';
    keyStrengths: string[];
    areasOfConcern: string[];
    familyFit: {
      schoolValues: number; // 1-5 scale
      academicExpectations: number;
      communityInvolvement: number;
      supportSystem: number;
    };
    studentObservations?: {
      communication: string;
      maturity: string;
      interests: string[];
      specialConsiderations: string[];
    };
  };
  detailedNotes: string;
  followUpActions?: Array<{
    action: string;
    assignedTo: string;
    dueDate: string;
  }>;
  flagsForReview?: Array<{
    flag: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
  }>;
}

class InterviewWorkflowService {
  private readonly basePath = '/v1/interviews';

  /**
   * Schedule new interview
   * Creates interview slot and sends invitations
   */
  async scheduleInterview(request: InterviewSchedulingRequest): Promise<{
    interview: Interview;
    invitationsSent: string[];
    confirmationCode: string;
    virtualMeetingCreated?: boolean;
  }> {
    const response = await httpClient.post<{ 
      data: {
        interview: Interview;
        invitationsSent: string[];
        confirmationCode: string;
        virtualMeetingCreated?: boolean;
      }
    }>(
      this.basePath,
      {
        ...request,
        scheduledBy: await this.getCurrentUserId(),
        createdAt: new Date().toISOString()
      }
    );
    return response.data;
  }

  /**
   * Get interviewer availability
   * Shows available time slots for scheduling
   */
  async getInterviewerAvailability(
    interviewerId: number,
    dateRange: { from: string; to: string },
    options?: {
      duration?: number;
      location?: string;
      mode?: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID';
    }
  ): Promise<InterviewAvailability> {
    const response = await httpClient.get<{ data: InterviewAvailability }>(
      `/v1/users/${interviewerId}/availability`,
      {
        params: {
          from: dateRange.from,
          to: dateRange.to,
          ...options
        }
      }
    );
    return response.data;
  }

  /**
   * Confirm interview attendance
   * Updates participant confirmation status
   */
  async confirmInterview(
    interviewId: number,
    confirmationData: {
      participantEmail: string;
      confirmationCode: string;
      confirmed: boolean;
      notes?: string;
      specialRequests?: string[];
    }
  ): Promise<InterviewConfirmation> {
    const response = await httpClient.post<{ data: InterviewConfirmation }>(
      `${this.basePath}/${interviewId}/confirm`,
      {
        ...confirmationData,
        confirmedAt: new Date().toISOString()
      }
    );
    return response.data;
  }

  /**
   * Reschedule interview
   * Changes date/time with proper notifications
   */
  async rescheduleInterview(
    interviewId: number,
    reschedulingData: InterviewRescheduling
  ): Promise<{
    interview: Interview;
    reschedulingId: string;
    notificationsSent: string[];
    requiresApproval: boolean;
  }> {
    const response = await httpClient.post<{ 
      data: {
        interview: Interview;
        reschedulingId: string;
        notificationsSent: string[];
        requiresApproval: boolean;
      }
    }>(
      `${this.basePath}/${interviewId}/reschedule`,
      {
        ...reschedulingData,
        requestedAt: new Date().toISOString()
      }
    );
    return response.data;
  }

  /**
   * Mark participant as no-show
   * Updates interview status and triggers follow-up
   */
  async markNoShow(
    interviewId: number,
    noShowData: {
      participantRole: string;
      waitTimeMinutes: number;
      contactAttempts: Array<{
        method: 'PHONE' | 'EMAIL' | 'SMS';
        timestamp: string;
        result: 'NO_ANSWER' | 'LEFT_MESSAGE' | 'BUSY' | 'UNREACHABLE';
      }>;
      notes: string;
      reschedulingOffered: boolean;
    }
  ): Promise<{
    interview: Interview;
    followUpActions: Array<{
      action: string;
      dueDate: string;
      assignedTo: string;
    }>;
    rescheduleOptions?: string[];
  }> {
    const response = await httpClient.post<{ 
      data: {
        interview: Interview;
        followUpActions: Array<{
          action: string;
          dueDate: string;
          assignedTo: string;
        }>;
        rescheduleOptions?: string[];
      }
    }>(
      `${this.basePath}/${interviewId}/no-show`,
      {
        ...noShowData,
        recordedAt: new Date().toISOString()
      }
    );
    return response.data;
  }

  /**
   * Complete interview with evaluation
   * Records outcomes and recommendations
   */
  async completeInterview(
    interviewId: number,
    completionData: InterviewCompletion
  ): Promise<{
    interview: Interview;
    reportGenerated: boolean;
    nextSteps: string[];
    notificationsSent: string[];
    flagsEscalated?: string[];
  }> {
    const response = await httpClient.post<{ 
      data: {
        interview: Interview;
        reportGenerated: boolean;
        nextSteps: string[];
        notificationsSent: string[];
        flagsEscalated?: string[];
      }
    }>(
      `${this.basePath}/${interviewId}/complete`,
      {
        ...completionData,
        completedAt: new Date().toISOString(),
        completedBy: await this.getCurrentUserId()
      }
    );
    return response.data;
  }

  /**
   * Get interview dashboard for interviewers
   */
  async getInterviewerDashboard(
    interviewerId?: number,
    dateRange?: { from: string; to: string }
  ): Promise<{
    upcomingInterviews: Array<{
      id: number;
      applicationId: number;
      studentName: string;
      scheduledDate: string;
      duration: number;
      location: string;
      type: string;
      confirmationStatus: string;
      preparationStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    }>;
    todaysInterviews: Array<{
      id: number;
      studentName: string;
      time: string;
      duration: number;
      location: string;
      status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW';
    }>;
    completedInterviews: {
      thisWeek: number;
      thisMonth: number;
      averageRating: number;
    };
    pendingActions: Array<{
      type: 'CONFIRMATION_NEEDED' | 'REPORT_DUE' | 'RESCHEDULING_REQUEST' | 'FOLLOW_UP';
      description: string;
      interviewId: number;
      dueDate: string;
    }>;
  }> {
    const response = await httpClient.get<{ 
      data: {
        upcomingInterviews: Array<{
          id: number;
          applicationId: number;
          studentName: string;
          scheduledDate: string;
          duration: number;
          location: string;
          type: string;
          confirmationStatus: string;
          preparationStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
        }>;
        todaysInterviews: Array<{
          id: number;
          studentName: string;
          time: string;
          duration: number;
          location: string;
          status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW';
        }>;
        completedInterviews: {
          thisWeek: number;
          thisMonth: number;
          averageRating: number;
        };
        pendingActions: Array<{
          type: 'CONFIRMATION_NEEDED' | 'REPORT_DUE' | 'RESCHEDULING_REQUEST' | 'FOLLOW_UP';
          description: string;
          interviewId: number;
          dueDate: string;
        }>;
      }
    }>(
      `/v1/users/${interviewerId || 'me'}/interview-dashboard`,
      { params: dateRange }
    );
    return response.data;
  }

  /**
   * Get interview preparation materials
   */
  async getPreparationMaterials(
    interviewId: number
  ): Promise<{
    studentProfile: {
      basicInfo: {
        name: string;
        age: number;
        currentSchool: string;
        gradeApplying: string;
      };
      academicBackground: {
        currentGrade: string;
        academicPerformance: string;
        specialNeeds: boolean;
        specialNeedsDetails?: string;
      };
      familyBackground: {
        parentOccupations: string[];
        siblings: Array<{
          name: string;
          age: number;
          schoolAttended: string;
        }>;
        previousSchoolExperience: string;
      };
    };
    applicationData: {
      motivationStatement: string;
      schoolChoiceReasons: string[];
      extracurricularInterests: string[];
      specialCircumstances: string[];
    };
    interviewGuide: {
      suggestedQuestions: Array<{
        category: string;
        questions: string[];
        purpose: string;
      }>;
      evaluationCriteria: Array<{
        criterion: string;
        description: string;
        weight: number;
      }>;
      redFlags: string[];
      positiveIndicators: string[];
    };
    previousEvaluations?: Array<{
      type: string;
      score: number;
      recommendations: string;
    }>;
  }> {
    const response = await httpClient.get<{ 
      data: {
        studentProfile: {
          basicInfo: {
            name: string;
            age: number;
            currentSchool: string;
            gradeApplying: string;
          };
          academicBackground: {
            currentGrade: string;
            academicPerformance: string;
            specialNeeds: boolean;
            specialNeedsDetails?: string;
          };
          familyBackground: {
            parentOccupations: string[];
            siblings: Array<{
              name: string;
              age: number;
              schoolAttended: string;
            }>;
            previousSchoolExperience: string;
          };
        };
        applicationData: {
          motivationStatement: string;
          schoolChoiceReasons: string[];
          extracurricularInterests: string[];
          specialCircumstances: string[];
        };
        interviewGuide: {
          suggestedQuestions: Array<{
            category: string;
            questions: string[];
            purpose: string;
          }>;
          evaluationCriteria: Array<{
            criterion: string;
            description: string;
            weight: number;
          }>;
          redFlags: string[];
          positiveIndicators: string[];
        };
        previousEvaluations?: Array<{
          type: string;
          score: number;
          recommendations: string;
        }>;
      }
    }>(
      `${this.basePath}/${interviewId}/preparation`
    );
    return response.data;
  }

  /**
   * Send interview reminder notifications
   */
  async sendReminders(
    interviewId: number,
    reminderType: '24_HOURS' | '2_HOURS' | '30_MINUTES' | 'CUSTOM',
    customMessage?: string
  ): Promise<{
    notificationsSent: Array<{
      recipient: string;
      method: 'EMAIL' | 'SMS' | 'PUSH';
      status: 'SENT' | 'FAILED';
      messageId: string;
    }>;
  }> {
    const response = await httpClient.post<{ 
      data: {
        notificationsSent: Array<{
          recipient: string;
          method: 'EMAIL' | 'SMS' | 'PUSH';
          status: 'SENT' | 'FAILED';
          messageId: string;
        }>;
      }
    }>(
      `${this.basePath}/${interviewId}/reminders`,
      {
        reminderType,
        customMessage,
        sentAt: new Date().toISOString()
      }
    );
    return response.data;
  }

  /**
   * Generate interview report
   */
  async generateInterviewReport(
    interviewId: number,
    options?: {
      includeRecommendations?: boolean;
      includeScores?: boolean;
      reportFormat?: 'PDF' | 'DOCX' | 'HTML';
      confidentialityLevel?: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED';
    }
  ): Promise<{
    reportId: string;
    reportUrl: string;
    generatedAt: string;
    expiresAt: string;
  }> {
    const response = await httpClient.post<{ 
      data: {
        reportId: string;
        reportUrl: string;
        generatedAt: string;
        expiresAt: string;
      }
    }>(
      `${this.basePath}/${interviewId}/report`,
      {
        options: {
          includeRecommendations: true,
          includeScores: true,
          reportFormat: 'PDF',
          confidentialityLevel: 'INTERNAL',
          ...options
        }
      }
    );
    return response.data;
  }

  /**
   * Get current user ID from session
   */
  private async getCurrentUserId(): Promise<number> {
    try {
      const profile = await httpClient.get<{ data: { id: number } }>('/v1/users/me');
      return profile.data.id;
    } catch {
      throw new Error('Unable to identify current user for interview operations');
    }
  }
}

// Export singleton instance
export const interviewWorkflowService = new InterviewWorkflowService();
export default interviewWorkflowService;