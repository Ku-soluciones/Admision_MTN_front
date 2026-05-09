import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { cpSync, rmSync, existsSync, mkdirSync } from 'node:fs';

const rootDir = process.cwd();
const apps = [
  { name: 'shell', path: 'microfrontends/apps/shell', publicPath: '.' },
  { name: 'admissions', path: 'microfrontends/apps/mf-admissions', publicPath: 'admissions' },
  { name: 'guardian', path: 'microfrontends/apps/mf-guardian', publicPath: 'guardian' },
  { name: 'student', path: 'microfrontends/apps/mf-student', publicPath: 'student' },
  { name: 'evaluations', path: 'microfrontends/apps/mf-evaluations', publicPath: 'evaluations' },
  { name: 'interviews', path: 'microfrontends/apps/mf-interviews', publicPath: 'interviews' },
  { name: 'admin', path: 'microfrontends/apps/mf-admin', publicPath: 'admin' },
  { name: 'reports', path: 'microfrontends/apps/mf-reports', publicPath: 'reports' },
  { name: 'coordinator', path: 'microfrontends/apps/mf-coordinator', publicPath: 'coordinator' },
];

for (const app of apps) {
  const result = spawnSync('npx', ['vite', 'build'], {
    cwd: path.join(rootDir, app.path),
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const distRoot = path.join(rootDir, 'dist');
if (existsSync(distRoot)) {
  rmSync(distRoot, { recursive: true, force: true });
}
mkdirSync(distRoot, { recursive: true });

for (const app of apps) {
  const srcDist = path.join(rootDir, app.path, 'dist');
  if (!existsSync(srcDist)) {
    process.stderr.write(`Missing dist for ${app.name} at ${srcDist}\n`);
    process.exit(1);
  }
  const destDir = app.publicPath === '.' ? distRoot : path.join(distRoot, app.publicPath);
  mkdirSync(destDir, { recursive: true });
  cpSync(srcDist, destDir, { recursive: true });
}

