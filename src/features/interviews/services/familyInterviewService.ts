import api from '../../admin/services/api';
import {
    calculateFamilyInterviewPercentage,
    calculateFamilyInterviewScores,
} from './familyInterviewScoring';

/**
 * Family Interview Service
 * Manages family interview templates and responses
 * Last verified: 2025-11-02 - Railway deployment
 */
class FamilyInterviewService {

    /**
     * Get interview template for specific grade
     * GET /api/evaluations/family-interview-template/:grade
     * @param grade - Student's applied grade (e.g., "PRE_KINDER", "5_BASICO", "IV_MEDIO")
     * @returns Filtered template with only applicable questions for that grade
     */
    async getTemplateForGrade(grade: string): Promise<any> {
        try {

            const response = await api.get(`/api/evaluations/family-interview-template/${grade}`);

            if (response.data.success) {
                return response.data.data;
            }

            throw new Error('Invalid response from server');
        } catch (error: any) {
            throw new Error(
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                'Error loading interview template'
            );
        }
    }

    /**
     * Get saved interview data for an evaluation
     * GET /api/evaluations/:evaluationId/family-interview-data
     * @param evaluationId - Evaluation ID
     * @returns Saved interview responses and score
     */
    async getInterviewData(evaluationId: number): Promise<{
        data: any;
        score: number;
    }> {
        try {

            const response = await api.get(`/api/evaluations/${evaluationId}/family-interview-data`);

            if (response.data.success) {
                return {
                    data: response.data.data || {},
                    score: response.data.score || 0
                };
            }

            throw new Error('Invalid response from server');
        } catch (error: any) {
            throw new Error(
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                'Error loading interview data'
            );
        }
    }

    /**
     * Save interview responses
     * PUT /api/evaluations/:evaluationId/family-interview-data
     * @param evaluationId - Evaluation ID
     * @param interviewData - Complete interview responses
     * @returns Saved data with calculated score
     */
    async saveInterviewData(
        evaluationId: number,
        interviewData: any
    ): Promise<{
        evaluationId: number;
        totalScore: number;
        interview_data: any;
    }> {
        try {

            const response = await api.put(
                `/api/evaluations/${evaluationId}/family-interview-data`,
                { interviewData }
            );

            if (response.data.success) {
                return {
                    evaluationId,
                    totalScore: Number(response.data.score || 0),
                    interview_data: response.data.data || {}
                };
            }

            throw new Error('Invalid response from server');
        } catch (error: any) {
            throw new Error(
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                'Error saving interview data'
            );
        }
    }

    /**
     * Calculate scores separated by sections and observations
     * Returns both section score and observation score for percentage calculation
     * @param interviewData - Interview responses
     * @returns Object with sectionScore and observationScore
     */
    calculateScores(interviewData: any, template?: any): { sectionScore: number; observationScore: number } {
        return calculateFamilyInterviewScores(interviewData, template);
    }

    /**
     * Calculate total score (for backward compatibility)
     * @param interviewData - Interview responses
     * @returns Total score
     */
    calculateScore(interviewData: any): number {
        const { sectionScore, observationScore } = this.calculateScores(interviewData);
        return sectionScore + observationScore;
    }

    /**
     * Validate interview responses completeness
     * @param template - Template for the grade
     * @param responses - Interview responses
     * @returns Validation result with errors
     */
    validateResponses(template: any, responses: any): {
        valid: boolean;
        errors: string[];
        missingQuestions: string[];
    } {
        const errors: string[] = [];
        const missingQuestions: string[] = [];

        if (!template || !template.sections) {
            errors.push('Invalid template');
            return { valid: false, errors, missingQuestions };
        }

        // Check that all sections have responses
        for (const [sectionKey, sectionData] of Object.entries(template.sections as any)) {
            if (!responses[sectionKey]) {
                errors.push(`Section ${sectionKey} is missing`);
                continue;
            }

            // Check that all questions in the section have responses
            for (const [questionKey, questionData] of Object.entries(sectionData.questions)) {
                if (!responses[sectionKey][questionKey]) {
                    missingQuestions.push(`${sectionKey} - ${questionKey}`);
                    errors.push(`Question ${questionKey} in section ${sectionKey} is missing`);
                } else {
                    const response = responses[sectionKey][questionKey];

                    // Validate score is a number
                    if (typeof response.score !== 'number') {
                        errors.push(`Question ${questionKey} in section ${sectionKey} has invalid score`);
                    }
                }
            }
        }

        // Check observations section
        if (!responses.observations) {
            errors.push('Observations section is missing');
        } else {
            if (!responses.observations.checklist) {
                errors.push('Observations checklist is missing');
            }
            if (!responses.observations.overallOpinion) {
                errors.push('Overall opinion is missing');
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            missingQuestions
        };
    }

    /**
     * Get grade range for a specific grade
     * Useful for UI logic
     */
    getGradeRange(grade: string): string {
        const gradeRanges: { [key: string]: string[] } = {
            PREKINDER_2BASICO: ['PRE_KINDER', 'KINDER', '1_BASICO', '2_BASICO'],
            '3BASICO_4BASICO': ['3_BASICO', '4_BASICO'],
            '5BASICO_3MEDIO': ['5_BASICO', '6_BASICO', '7_BASICO', '8_BASICO', 'I_MEDIO', 'II_MEDIO', 'III_MEDIO'],
            '4MEDIO': ['IV_MEDIO']
        };

        for (const [rangeKey, grades] of Object.entries(gradeRanges)) {
            if (grades.includes(grade)) {
                return rangeKey;
            }
        }

        // Default to largest range if not found
        return '5BASICO_3MEDIO';
    }

    /**
     * Get maximum possible score
     */
    getMaxScore(): number {
        return 51; // 10+10+10+10 (sections) + 7 (observations checklist) + 4 (overall opinion)
    }

    /**
     * Format score for display
     */
    formatScore(score: number): string {
        return `${score}/${this.getMaxScore()}`;
    }

    /**
     * Get score percentage using weighted formula
     * Formula: (sectionScore/20 * 90) + (observationScore/11 * 10)
     * - Sections (max 20 points) = 90% weight
     * - Observations (max 11 points) = 10% weight
     *   - Checklist: 6 points (6 items × 1pt each)
     *   - Overall opinion: up to 5 points
     * @param interviewData - Interview responses object
     * @returns Percentage score (0-100)
     */
    getScorePercentage(interviewData: any, template?: any): number {
        return calculateFamilyInterviewPercentage(interviewData, template);
    }
}

export const familyInterviewService = new FamilyInterviewService();
export default familyInterviewService;
