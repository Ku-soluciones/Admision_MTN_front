import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { cpSync, rmSync, existsSync } from 'node:fs';

const rootDir = process.cwd();
const apps = [
  'microfrontends/apps/shell',
  'microfrontends/apps/mf-admissions',
  'microfrontends/apps/mf-guardian',
  'microfrontends/apps/mf-student',
  'microfrontends/apps/mf-evaluations',
  'microfrontends/apps/mf-interviews',
  'microfrontends/apps/mf-admin',
  'microfrontends/apps/mf-reports',
  'microfrontends/apps/mf-coordinator',
];

for (const app of apps) {
  console.log(`Building ${app}...`);
  const result = spawnSync('npx', ['vite', 'build'], {
    cwd: path.join(rootDir, app),
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('All microfrontends built successfully.');

// Copy shell dist to root for Vercel deployment
const shellDistPath = path.join(rootDir, 'microfrontends/apps/shell/dist');
const rootDistPath = path.join(rootDir, 'dist');

if (existsSync(shellDistPath)) {
  console.log('Copying shell dist to root for Vercel...');
  // Remove existing root dist if present
  if (existsSync(rootDistPath)) {
    rmSync(rootDistPath, { recursive: true, force: true });
  }
  // Copy shell dist to root
  cpSync(shellDistPath, rootDistPath, { recursive: true });
  console.log('Output directory ready at: dist/');
} else {
  console.error('Error: shell dist directory not found');
  process.exit(1);
}
