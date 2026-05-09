import { spawn } from 'node:child_process';
import path from 'node:path';

const rootDir = process.cwd();
const apps = [
  ['shell', 'microfrontends/apps/shell'],
  ['mf-admissions', 'microfrontends/apps/mf-admissions'],
  ['mf-guardian', 'microfrontends/apps/mf-guardian'],
  ['mf-student', 'microfrontends/apps/mf-student'],
  ['mf-evaluations', 'microfrontends/apps/mf-evaluations'],
  ['mf-interviews', 'microfrontends/apps/mf-interviews'],
  ['mf-admin', 'microfrontends/apps/mf-admin'],
  ['mf-reports', 'microfrontends/apps/mf-reports'],
  ['mf-coordinator', 'microfrontends/apps/mf-coordinator'],
];

const children = apps.map(([name, relPath]) => {
  const child = spawn('npx', ['vite'], {
    cwd: path.join(rootDir, relPath),
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
    }
  });

  return child;
});

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

