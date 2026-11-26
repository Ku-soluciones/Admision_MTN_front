import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRuntimeApiBaseUrl } from './runtimeApiBaseUrl.ts';

test('usa rutas relativas en localhost para pasar por el proxy de Vite', () => {
  assert.equal(resolveRuntimeApiBaseUrl({
    hostname: 'localhost',
    origin: 'http://localhost:5200',
    configuredBaseUrl: 'https://admitia-nginx-staging.up.railway.app',
  }), '');
});

test('respeta la URL configurada fuera de localhost', () => {
  assert.equal(resolveRuntimeApiBaseUrl({
    hostname: 'app.example.cl',
    origin: 'https://app.example.cl',
    configuredBaseUrl: 'https://gateway.example.cl/',
  }), 'https://gateway.example.cl');
});

test('usa el origen del despliegue cuando no existe configuración explícita', () => {
  assert.equal(resolveRuntimeApiBaseUrl({
    hostname: 'app.example.cl',
    origin: 'https://app.example.cl',
  }), 'https://app.example.cl');
});

test('respeta la configuración cuando no existe contexto de navegador', () => {
  assert.equal(resolveRuntimeApiBaseUrl({
    configuredBaseUrl: 'https://gateway.example.cl/',
  }), 'https://gateway.example.cl');
});

