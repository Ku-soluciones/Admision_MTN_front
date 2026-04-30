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
  console.log(`Building ${app.path}...`);
  const result = spawnSync('npx', ['vite', 'build'], {
    cwd: path.join(rootDir, app.path),
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('All microfrontends built successfully.');

const rootDistPath = path.join(rootDir, 'dist');

if (existsSync(rootDistPath)) {
  rmSync(rootDistPath, { recursive: true, force: true });
}

mkdirSync(rootDistPath, { recursive: true });

for (const app of apps) {
  const appDistPath = path.join(rootDir, app.path, 'dist');
  if (!existsSync(appDistPath)) {
    console.error(`Error: dist directory not found for ${app.name}: ${appDistPath}`);
    process.exit(1);
  }

  const destination = app.publicPath === '.'
    ? rootDistPath
    : path.join(rootDistPath, app.publicPath);

  console.log(`Copying ${app.name} to dist/${app.publicPath}`);
  cpSync(appDistPath, destination, { recursive: true });
}

console.log('Vercel output directory ready at: dist/');
