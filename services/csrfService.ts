/**
 * CSRF Protection Service
 *
 * Manages CSRF tokens for secure form submissions
 * Implements synchronizer token pattern for CSRF protection
 */

import axios from 'axios';
import { getApiBaseUrl } from '../config/api.config';

class CsrfService {
    private csrfToken: string | null = null;
    private tokenExpiry: number | null = null;
    private readonly TOKEN_LIFETIME = 3600000; // 1 hour in milliseconds

    /**
     * Fetch a new CSRF token from the backend
     * This should be called before making any POST/PUT/DELETE requests
     *
     * IMPORTANT: Uses axios directly (not the api client) to avoid interceptor loops.
     * The api client has an interceptor that tries to add CSRF tokens, which would
     * cause infinite recursion if we used it to fetch the CSRF token itself.
     */
    async fetchCsrfToken(): Promise<string> {
        try {
            console.log('[CSRF] Fetching new CSRF token...');

            // Use axios directly to avoid interceptor loop
            const baseUrl = getApiBaseUrl();
            const response = await axios.get(`${baseUrl}/v1/auth/csrf-token`, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success && response.data.csrfToken) {
                this.csrfToken = response.data.csrfToken;
                this.tokenExpiry = Date.now() + this.TOKEN_LIFETIME;

                console.log('[CSRF] Token fetched successfully');
                console.log('[CSRF] Token expires at:', new Date(this.tokenExpiry).toLocaleTimeString());

                return this.csrfToken;
            } else {
                throw new Error('Invalid CSRF token response');
            }
        } catch (error: any) {
            console.error('[CSRF] Error fetching CSRF token:', error);
            throw new Error('Failed to fetch CSRF token: ' + error.message);
        }
    }

    /**
     * Get the current CSRF token, fetching a new one if expired or missing
     */
    async getCsrfToken(): Promise<string> {
        // Check if token exists and is still valid
        if (this.csrfToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            console.log('[CSRF] Using cached token');
            return this.csrfToken;
        }

        // Token is missing or expired, fetch a new one
        console.log('[CSRF] Token expired or missing, fetching new token');
        return await this.fetchCsrfToken();
    }

    /**
     * Get CSRF headers to include in requests
     * Returns an object with the X-CSRF-Token header
     */
    async getCsrfHeaders(): Promise<{ 'X-CSRF-Token': string }> {
        const token = await this.getCsrfToken();
        return {
            'X-CSRF-Token': token
        };
    }

    /**
     * Clear the cached CSRF token
     * Should be called on logout or when token becomes invalid
     */
    clearToken(): void {
        console.log('[CSRF] Clearing cached token');
        this.csrfToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Check if the current token is valid (not expired)
     */
    isTokenValid(): boolean {
        return !!(this.csrfToken && this.tokenExpiry && Date.now() < this.tokenExpiry);
    }
}

// Export singleton instance
export const csrfService = new CsrfService();
