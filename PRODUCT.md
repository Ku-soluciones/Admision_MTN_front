# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

El equipo interno de admisión Prekínder 2027: coordinación, docentes, psicología, dirección de ciclo y entrevistadores. Trabajan simultáneamente sobre postulaciones, evaluaciones y comentarios durante jornadas de admisión.

## Product Purpose

Gestionar el flujo completo de Prekínder en un módulo aislado de los procesos legacy. El éxito exige que las ediciones simultáneas persistan sin sobrescrituras silenciosas, que la colaboración se recupere tras una desconexión y que los datos sensibles nunca se filtren por transporte, caché o logs.

## Positioning

PostgreSQL Prekínder es siempre la fuente oficial; el tiempo real comunica eventos mínimos y obliga a resincronizar desde datos autorizados. Cada campo tiene versión independiente y cada comentario conserva su historial completo.

## Operating Context

El módulo cubre postulantes y familias, workflows, cuestionarios versionados, inclusión y consentimientos, jornadas y grupos, evaluaciones, apoyo/DAP, consolidación, comisión y ofertas. Opera detrás del NGINX institucional y comparte el login existente, no su base de datos.

## Capabilities and Constraints

- Base PostgreSQL y Redis exclusivos, privados y sin cruces con la base legacy.
- REST y WebSocket bajo `/v1/prekinder`; WSS con ticket de uso único y renovación antes de 12 minutos.
- Access token sólo en memoria y refresh mediante cookie HttpOnly; el módulo no persiste tokens en `localStorage`.
- Comentarios con UUID, idempotencia, secuencia, revisiones, conflictos explícitos y tombstones auditados.
- Texto libre cifrado con AES-256-GCM envelope encryption antes de persistir.
- Redis sólo recibe identificadores y metadatos mínimos de eventos.
- Debe seguir funcionando en modo degradado REST cuando Redis no esté disponible.
- Objetivos operativos: 500 sockets, 100 operaciones/s, ACK p95 <300 ms, fan-out p95 <500 ms y reconexión normal <3 s.

## Brand Commitments

Conservar el nombre Sistema de Admisión MTN, el español institucional, la marca Monte Tabor y Nazaret y el lenguaje visual ya usado por las superficies administrativas.

## Evidence on Hand

Los flujos funcionales fuente están en `/Users/camilogonzalez/Downloads/FLUJOS_PROCESO_ADMISION_PREKINDER_2027 copia.md`. No existen postulaciones Prekínder que deban migrarse ni contenido real que pueda usarse como demostración.

## Product Principles

- Persistir antes de confirmar.
- Mostrar conflicto antes que descartar trabajo.
- Autorizar cada operación, no sólo la conexión.
- Aislar el riesgo Prekínder del producto legacy.
- Degradar con claridad y resincronizar de forma verificable.

## Accessibility & Inclusion

Interfaz operable por teclado, foco visible, estados anunciables, contraste WCAG AA y mensajes que indiquen el problema y la recuperación.
