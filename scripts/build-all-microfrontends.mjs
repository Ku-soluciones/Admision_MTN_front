import { spawnSync } from 'node:child_process';
import path from 'node:path';

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
