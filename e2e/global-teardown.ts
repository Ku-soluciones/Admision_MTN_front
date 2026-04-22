import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Global Teardown for Playwright E2E Tests
 * Sistema de Admisión MTN - Fase 0 Pre-flight
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for E2E tests...');
  
  try {
    // Clean up authentication files
    const authDir = path.join(__dirname, '.auth');
    if (fs.existsSync(authDir)) {
      console.log('Cleaning up authentication states...');
      fs.rmSync(authDir, { recursive: true, force: true });
      console.log('Authentication states cleaned up');
    }
    
    // Clean up test artifacts if needed
    const testResultsDir = path.join(__dirname, '..', 'test-results');
    if (fs.existsSync(testResultsDir)) {
      console.log('Test results preserved in test-results/ directory');
    }
    
    // Additional cleanup can go here
    console.log('Global teardown completed successfully');
    
  } catch (error) {
    console.error('Global teardown failed:', error);
  }
}

export default globalTeardown;