/**
 * Unified API Client - Complete Typed SDK
 * Generated for MTN Admission System
 */

import { usersClient } from './users.client';
import { applicationsClient } from './applications.client';
import { evaluationsClient } from './evaluations.client';
import httpClient from '../../services/http';

/**
 * Unified API client providing access to all services
 * with comprehensive TypeScript support and error handling
 */
export class ApiClient {
  // Service clients
  public readonly users = usersClient;
  public readonly applications = applicationsClient;
  public readonly evaluations = evaluationsClient;

  // HTTP client instance
  public readonly http = httpClient;

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{
    overall: boolean;
    services: Record<string, boolean>;
    timestamp: string;
  }> {
    const results: Record<string, boolean> = {};
    
    // Check main API health
    results.api = await httpClient.healthCheck();
    
    // Check individual service endpoints
    try {
      await this.users.getUserStatistics();
      results.users = true;
    } catch {
      results.users = false;
    }

    try {
      await this.applications.getApplicationStatistics();
      results.applications = true;
    } catch {
      results.applications = false;
    }

    try {
      await this.evaluations.getEvaluationStatistics();
      results.evaluations = true;
    } catch {
      results.evaluations = false;
    }

    const overall = Object.values(results).every(status => status === true);

    return {
      overall,
      services: results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Configure HTTP client settings
   */
  configure(options: {
    baseURL?: string;
    timeout?: number;
    retryConfig?: {
      attempts?: number;
      delay?: number;
      jitter?: boolean;
    };
  }) {
    if (options.baseURL) {
      httpClient.setBaseURL(options.baseURL);
    }
    
    if (options.timeout) {
      httpClient.setTimeout(options.timeout);
    }
    
    if (options.retryConfig) {
      httpClient.setRetryConfig(options.retryConfig);
    }
  }

  /**
   * Get comprehensive system statistics
   */
  async getSystemStatistics() {
    const [userStats, appStats, evalStats] = await Promise.allSettled([
      this.users.getUserStatistics(),
      this.applications.getApplicationStatistics(),
      this.evaluations.getEvaluationStatistics()
    ]);

    return {
      users: userStats.status === 'fulfilled' ? userStats.value : null,
      applications: appStats.status === 'fulfilled' ? appStats.value : null,
      evaluations: evalStats.status === 'fulfilled' ? evalStats.value : null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Search across all services
   */
  async globalSearch(query: string, options?: {
    includeUsers?: boolean;
    includeApplications?: boolean;
    includeEvaluations?: boolean;
  }) {
    const { 
      includeUsers = true, 
      includeApplications = true, 
      includeEvaluations = true 
    } = options || {};

    const searchPromises: Promise<any>[] = [];
    const results: any = {};

    if (includeUsers) {
      searchPromises.push(
        this.users.searchUsers(query).then(data => {
          results.users = data;
        }).catch(() => {
          results.users = [];
        })
      );
    }

    if (includeApplications) {
      searchPromises.push(
        this.applications.searchApplications(query).then(data => {
          results.applications = data;
        }).catch(() => {
          results.applications = [];
        })
      );
    }

    if (includeEvaluations) {
      searchPromises.push(
        this.evaluations.getEvaluations({ 
          applicationId: parseInt(query) || undefined 
        }).then(data => {
          results.evaluations = data.content || [];
        }).catch(() => {
          results.evaluations = [];
        })
      );
    }

    await Promise.all(searchPromises);
    
    return {
      query,
      results,
      totalResults: (
        (results.users?.length || 0) +
        (results.applications?.length || 0) +
        (results.evaluations?.length || 0)
      ),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get metrics from HTTP client
   */
  getMetrics() {
    return {
      httpMetrics: httpClient.getMetrics(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    httpClient.clearMetrics();
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export individual service clients for direct access
export { usersClient, applicationsClient, evaluationsClient };

// Export all types
export * from './index';

// Default export
export default apiClient;