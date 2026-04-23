/**
 * API Configuration
 * Runtime detection of deployment environment
 *
 * CRITICAL: This MUST be evaluated at RUNTIME in the browser.
 * DO NOT use build-time environment variables or vite.config.ts defines.
 *
 * Architecture:
 * - This function is called in the request interceptor of http.ts
 * - It detects the hostname in the browser at runtime
 * - Vercel deployments automatically route to Railway backend
 * - Local development uses localhost:8080
 */

/**
 * Get the API base URL based on the current environment
 *
 * Detection logic:
 * 1. Check if running in browser (window.location exists)
 * 2. Extract hostname from window.location
 * 3. Match against known patterns (vercel.app, production domains)
 * 4. Return appropriate backend URL
 *
 * This function uses defensive coding to prevent tree-shaking:
 * - Direct window access (not globalThis)
 * - String methods instead of simple comparisons
 * - Try-catch for safety
 * - Explicit console.log calls (side effects prevent optimization)
 */
export function getApiBaseUrl(): string {
  // DEFENSIVE: Use try-catch to prevent build-time optimization
  try {
    // DEFENSIVE: Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.warn('[API Config] Not in browser environment, using localhost');
      return 'https://admitia-bff-staging.up.railway.app';
    }

    // DEFENSIVE: Access window.location directly to force runtime evaluation
    const location = window.location;
    const hostname = location.hostname;

    // DEFENSIVE: Use String() wrapper and indexOf() to prevent optimization
    const hostnameStr = String(hostname);

    // Debug logging (side effect prevents tree-shaking)
    console.log('[API Config] ========================================');
    console.log('[API Config] Full location:', location.href);
    console.log('[API Config] Hostname detected:', hostnameStr);
    console.log('[API Config] Protocol:', location.protocol);
    console.log('[API Config] Port:', location.port);
    console.log('[API Config] ========================================');

    // Railway backend URL (production) - Gateway Service
    const RAILWAY_URL = 'https://admitia-bff-staging.up.railway.app';

    // DEFENSIVE: Use indexOf instead of includes for compatibility
    // Vercel deployment detection
    const isVercel = hostnameStr.indexOf('vercel.app') !== -1;
    console.log('[API Config] Is Vercel?', isVercel, '(checking for "vercel.app" in', hostnameStr, ')');

    if (isVercel) {
      console.log('[API Config] ✅ Vercel deployment detected → Railway backend');
      console.log('[API Config] Returning:', RAILWAY_URL);
      return RAILWAY_URL;
    }

    // Custom production domains
    if (hostnameStr === 'admision.mtn.cl' || hostnameStr === 'admin.mtn.cl') {
      console.log('[API Config] Production domain detected → Railway backend');
      return RAILWAY_URL;
    }

    // Default to localhost for development
    console.log('[API Config] ⚠️  No match found, defaulting to localhost');
    console.log('[API Config] Hostname was:', hostnameStr);
    return 'https://admitia-bff-staging.up.railway.app';
  } catch (error) {
    // Fallback for any unexpected errors
    console.error('[API Config] Error detecting environment:', error);
    return 'https://admitia-bff-staging.up.railway.app';
  }
}

// DEFENSIVE: Export a non-optimizable version for debugging
// This forces the bundler to keep the function
export const API_CONFIG_VERSION = '2.0-runtime-detection';
export const debugApiConfig = () => {
  console.log('API Config Version:', API_CONFIG_VERSION);
  console.log('Current Base URL:', getApiBaseUrl());
};
