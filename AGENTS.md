# AGENTS.md

## Alcance

Este archivo aplica a `Admision_MTN_front`.

## Arquitectura

El proyecto es un frontend React + Vite integrado.

- `src/app`: bootstrap, providers, componentes atómicos globales y selección de dominio por ruta.
- `src/features`: dominios funcionales de admisión, apoderados, estudiantes, evaluaciones, entrevistas, administración, reportes y coordinación.
- `src/packages`: código compartido interno.

## Comandos

```bash
npm run dev
npm run build
npm run preview
```

## Reglas

- No crear aplicaciones separadas por dominio.
- No agregar scripts, puertos, builds o documentación para apps separadas.
- Si se detecta lógica duplicada entre dominios, extraerla a un componente o helper atómico con una sola responsabilidad.
- Mantener assets y código compartido dentro de `src/packages`.
- No editar `node_modules`, `dist`, `.git` ni archivos de entorno salvo que la tarea lo pida explícitamente.
