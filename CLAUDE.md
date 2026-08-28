# CLAUDE.md

## Frontend Integrado

Este repositorio contiene una sola app React + Vite.

```bash
npm install
npm run dev
npm run build
npm run preview
```

URL local:

```text
http://localhost:5200/#/
```

## Estructura

```text
src/app
src/features
src/packages
```

`src/app` contiene el arranque de aplicación, providers y router de alto nivel.

`src/features` contiene los dominios funcionales.

`src/packages` contiene código compartido interno.

## Convenciones

- Mantener una sola app Vite.
- No crear builds o entrypoints por dominio.
- Extraer componentes atómicos cuando una pieza de UI o lógica se reutilice.
- Los componentes atómicos deben tener una sola responsabilidad y props explícitas.
- Validar con `npm run build` después de cambios estructurales.
