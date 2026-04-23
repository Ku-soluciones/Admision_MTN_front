import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

/**
 * Global Setup for Playwright E2E Tests
 * Sistema de Admisión MTN - Fase 0 Pre-flight
 */

async function globalSetup(config: FullConfig) {
  console.log('🔧 Starting global setup for E2E tests...');
  
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:5173';
  const backendURL = process.env.BACKEND_URL || 'http://localhost:8080';
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for backend to be ready
    console.log('⏳ Waiting for backend to be ready...');
    await waitForService(backendURL, 60000);
    console.log('✅ Backend is ready');
    
    // Wait for frontend to be ready
    console.log('⏳ Waiting for frontend to be ready...');
    await waitForService(baseURL, 60000);
    console.log('✅ Frontend is ready');
    
    // Authenticate admin user and save state
    console.log('🔐 Setting up admin authentication...');
    await page.goto(`${baseURL}/admin/login`);
    
    await page.fill('[data-testid="email-input"]', 'admin@mtn.cl');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await page.waitForURL(/.*admin/, { timeout: 10000 });
    console.log('✅ Admin authentication successful');
    
    // Save authenticated state
    await page.context().storageState({ 
      path: path.join(__dirname, '.auth', 'admin.json') 
    });
    
    // Setup test data if needed
    console.log('📊 Setting up test data...');
    await setupTestData(page, backendURL);
    console.log('✅ Test data setup complete');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('🎉 Global setup completed successfully!');
}

/**
 * Wait for a service to be ready
 */
async function waitForService(url: string, timeout: number = 30000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url.includes('8080') ? `${url}/actuator/health` : url);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // Service not ready yet, continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Service at ${url} not ready after ${timeout}ms`);
}

/**
 * Setup test data via API calls
 */
async function setupTestData(page: any, backendURL: string): Promise<void> {
  // Create test users if they don't exist
  try {
    const response = await page.request.get(`${backendURL}/v1/test/ping`);
    if (response.ok()) {
      console.log('📋 Test endpoint is accessible');
    }
    
    // Additional test data setup can go here
    // For example: create test applications, users, etc.
    
  } catch (error) {
    console.warn('⚠️ Could not setup additional test data:', error);
  }
}

export default globalSetup;
