# MTN Admisión Frontend

Frontend integrado del Sistema de Admisión MTN.

## Estructura

```text
src/
  app/                  # Bootstrap, providers y selección de dominio
    components/         # Componentes atómicos de aplicación
    routing/            # Selección pura de módulo por ruta
  features/             # Dominios funcionales
    admissions/
    guardian/
    student/
    evaluations/
    interviews/
    admin/
    reports/
    coordinator/
  packages/             # Código compartido interno
    backend-sdk/
    contracts/
    shared-ui/
    shared-utils/
```

## Comandos

```bash
npm install
npm run dev
npm run build
npm run preview
```

La app local corre en:

```text
http://localhost:5200/
```

## Rutas Principales

- `/`
- `/postulacion`
- `/apoderado/login`
- `/familia`
- `/examenes`
- `/profesor/login`
- `/profesor`
- `/entrevistas`
- `/admin`
- `/reportes`
- `/coordinador`

## Reglas De Trabajo

- Mantener una sola app Vite.
- No agregar entrypoints, puertos o builds por dominio funcional.
- Compartir UI y utilidades desde `src/packages`.
- Crear componentes atómicos cuando se unifique comportamiento repetido.
- Mantener cambios de dominio dentro de `src/features/<dominio>`.
