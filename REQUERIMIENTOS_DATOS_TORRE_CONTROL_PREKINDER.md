# Requerimientos de datos — Administración y torre de control Prekínder

## 1. Propósito y alcance

Este documento registra qué elementos del modelo Prekínder actual pueden reutilizarse y qué cambios deberán realizarse más adelante en la base de datos y el BFF para soportar completamente la administración de postulaciones y la torre de control.

La implementación actual modifica **solo el frontend**. No se realizaron cambios en `admitia-bff`, sus migraciones ni su base de datos. La captura de pautas, puntajes y el panel de evaluadores queda fuera de esta fase.

## 2. Modelo existente que se debe reutilizar

La revisión se realizó sobre las migraciones `V1__create_prekinder_model.sql`, `V2__integral_prekinder_flow.sql`, `V3__flexible_groups_and_parent_notifications.sql` y `V4__actors_external_subject_unique_constraint.sql`, además de los controladores y servicios Prekínder del BFF.

### Proceso y postulaciones

| Necesidad | Recurso existente | Decisión |
|---|---|---|
| Proceso anual | `admission_processes` | Reutilizar como raíz del proceso Prekínder. |
| Etapas de postulación | `process_waves` y `workflow_stages` | Reutilizar; no crear un calendario paralelo. |
| Familias y postulantes | `families`, `applicants`, `applications` | Reutilizar identificadores y estados actuales. |
| Trazabilidad de estado | `application_state_history` | Reutilizar para cambios del proceso de postulación. |
| Elegibilidad | declaraciones y revisiones existentes | Reutilizar para determinar quién puede asignarse a una jornada. |
| Inclusión | `inclusion_records` y revisiones | Reutilizar con acceso restringido; no duplicar datos sensibles en la torre. |

### Jornadas y torre de control

| Necesidad | Recurso existente | Decisión |
|---|---|---|
| Salas | `prekinder_rooms` | Reutilizar. |
| Fechas y bloques | `evaluation_days`, `evaluation_blocks` | Usar como modelo canónico para jornadas. |
| Grupos por sala/hora | `evaluation_groups` | Reutilizar. Soporta código, modalidad, capacidad, equipo requerido, estado y versión. |
| Integrantes | `evaluation_group_members` | Reutilizar. Ya contempla `ASSIGNED`, `ATTENDED`, `ABSENT`, `MOVED` y `CANCELLED`. |
| Cruce de postulantes | `applicant_group_bookings` | Reutilizar su restricción para impedir doble reserva. |
| Cruce de salas | restricciones de rango temporal existentes | Reutilizar; la validación debe seguir siendo transaccional en el BFF. |
| Equipo asignado | `group_evaluator_assignments` y `evaluator_group_bookings` | Reutilizar, aunque su interfaz no forma parte de esta entrega. |
| Historial de asignación | `group_assignment_history` | Reutilizar y exponer mediante API. |
| Cambios concurrentes | columna `version` y operaciones idempotentes | Reutilizar para evitar que dos coordinadores sobrescriban cambios. |
| Auditoría | `audit_events` | Reutilizar para toda acción operativa. |

> Existen tablas antiguas de agenda (`schedules`, `schedule_rooms`, `schedule_slots` y `schedule_assignments`) junto con el modelo integral posterior. Para la torre nueva se recomienda declarar **canónico** el modelo `evaluation_days` → `evaluation_blocks` → `evaluation_groups` y evitar escribir simultáneamente en ambos modelos.

## 3. APIs existentes aprovechadas por el frontend

La nueva vista puede trabajar hoy con las siguientes operaciones:

- consultar procesos, etapas, postulaciones elegibles, salas y grupos por fecha;
- crear un grupo de evaluación;
- configurar capacidad y cantidad requerida de profesionales;
- agregar un postulante al grupo;
- reasignar el grupo completo a otra sala u hora;
- asignar profesionales desde el flujo administrativo existente;
- confirmar el grupo cuando cumple sus condiciones;
- detectar conflictos de sala, postulante o profesional mediante las restricciones actuales.

Esto permite cubrir la planificación visual y llegar hasta el estado **“grupo listo para evaluación”** sin modificar la base de datos.

## 4. Cambios necesarios en API/BFF antes de producción

### 4.1 Asistencia y recepción

La base ya posee estados de asistencia en `evaluation_group_members`, pero falta una operación pública para modificarlos.

Agregar:

```http
PATCH /v1/prekinder/groups/{groupId}/members/{applicationId}/status
```

Entrada sugerida:

```json
{
  "status": "ATTENDED",
  "reason": null,
  "expectedGroupVersion": 4,
  "operationId": "uuid"
}
```

Reglas:

- estados permitidos: `ASSIGNED`, `ATTENDED`, `ABSENT`, `CANCELLED`;
- registrar actor, fecha, motivo y valores anterior/nuevo en auditoría;
- exigir motivo para ausencia o cancelación corregida después del inicio;
- publicar actualización en tiempo real para la torre.

### 4.2 Mover o intercambiar un postulante

Hoy se puede mover el grupo completo, pero no un integrante individual. Agregar una operación atómica:

```http
POST /v1/prekinder/groups/{sourceGroupId}/members/{applicationId}/move
```

Entrada sugerida:

```json
{
  "targetGroupId": "uuid",
  "reason": "Reorganización de recepción",
  "expectedSourceVersion": 3,
  "expectedTargetVersion": 6,
  "operationId": "uuid"
}
```

Debe validar en una sola transacción:

- cupo disponible en destino;
- ausencia de solapamiento del postulante;
- grupos del mismo proceso;
- estados que permiten edición;
- actualización de `evaluation_group_members` y reservas;
- inserción en `group_assignment_history` y `audit_events`;
- notificación a los clientes conectados.

Para intercambio entre dos postulantes conviene un endpoint específico o aceptar `swapWithApplicationId`, siempre atómico.

### 4.3 Quitar un postulante del grupo

Agregar una operación que marque la relación como `CANCELLED` o `MOVED` en vez de borrar físicamente el registro:

```http
DELETE /v1/prekinder/groups/{groupId}/members/{applicationId}
```

Debe recibir motivo, versión esperada e identificador de operación. La reserva activa asociada debe liberarse sin perder trazabilidad.

### 4.4 Incidencias operativas

No se encontró una entidad específica para registrar atrasos, problemas de sala, retiro anticipado o contingencias de jornada. Agregar:

```sql
create table prekinder_operational_incidents (
  incident_id uuid primary key,
  process_id uuid not null,
  evaluation_group_id uuid null,
  application_id uuid null,
  incident_type varchar(40) not null,
  severity varchar(20) not null,
  status varchar(20) not null,
  description text not null,
  resolution text null,
  reported_by uuid not null,
  resolved_by uuid null,
  reported_at timestamptz not null,
  resolved_at timestamptz null,
  version bigint not null default 0
);
```

Tipos iniciales sugeridos: `LATE_ARRIVAL`, `NO_SHOW`, `ROOM_ISSUE`, `HEALTH_EVENT`, `SCHEDULE_CHANGE`, `OTHER`.

Endpoints mínimos:

- `POST /v1/prekinder/operational-incidents`;
- `GET /v1/prekinder/processes/{processId}/operational-incidents?date=...`;
- `PATCH /v1/prekinder/operational-incidents/{incidentId}`.

Los datos clínicos o de inclusión no deben copiarse a esta tabla; solo debe registrarse información operacional estrictamente necesaria.

### 4.5 Historial visible del bloque

Exponer el recurso ya existente `group_assignment_history`:

```http
GET /v1/prekinder/groups/{groupId}/history
```

La respuesta debería entregar acción, actor, fecha, motivo y resumen de valores anterior/nuevo, sin exponer payloads sensibles.

### 4.6 DTO dedicado para la torre

La torre puede construirse actualmente combinando salas, grupos y postulaciones, pero a escala genera múltiples consultas y asociaciones en cliente. Agregar un endpoint agregado:

```http
GET /v1/prekinder/processes/{processId}/control-tower?date=YYYY-MM-DD
```

Respuesta sugerida:

- fecha, zona horaria y última actualización;
- salas activas;
- bloques y grupos ordenados;
- integrantes con nombre resumido y estado de asistencia;
- contadores de capacidad, asignados, presentes y ausentes;
- indicadores de conflicto o configuración incompleta;
- versiones necesarias para editar;
- incidencias abiertas.

No debe incluir respuestas de pautas, puntajes, comentarios clínicos ni antecedentes restringidos de inclusión.

## 5. Cambios recomendados en base de datos

### Obligatorios

1. Crear `prekinder_operational_incidents` y sus índices por proceso/fecha, grupo y estado.
2. Asegurar que `evaluation_group_members` conserve historial lógico al mover o cancelar integrantes.
3. Agregar o confirmar metadatos de auditoría (`updated_at`, `updated_by`, `version`) en las entidades que serán editadas desde la torre.
4. Definir una única fuente canónica entre las tablas antiguas de agenda y el modelo de grupos vigente.

### No requeridos por ahora

- No crear tablas nuevas para procesos, postulantes, salas, bloques o grupos.
- No duplicar profesionales ni asignaciones.
- No agregar tablas de puntaje o pautas en esta fase.
- No migrar datos de Airtable o Excel directamente a tablas operativas sin un proceso separado de homologación y validación.

## 6. Roles y permisos de esta fase

| Acción | Administrador Prekínder | Coordinador / torre | Evaluador |
|---|---:|---:|---:|
| Configurar proceso y etapas | Sí | Lectura | No |
| Revisar elegibilidad | Sí | Según permiso | No |
| Crear/configurar bloques | Sí | Sí | No |
| Asignar o mover postulantes | Sí | Sí | No |
| Registrar asistencia/incidencia | Sí | Sí | No en esta fase |
| Ver información sensible de inclusión | Permiso específico | Permiso específico | No por defecto |
| Capturar pauta o puntaje | Fuera de esta fase | Fuera de esta fase | Fase posterior |

El BFF debe hacer cumplir estos permisos; ocultar botones en el frontend no constituye control de acceso.

## 7. Concurrencia y tiempo real

Como habrá varias salas y usuarios operando en paralelo, cada mutación deberá:

1. incluir `expectedVersion` y un `operationId` idempotente;
2. responder `409 Conflict` cuando el registro cambió;
3. publicar un evento con proceso, fecha, grupo afectado, nueva versión y tipo de cambio;
4. permitir que el frontend refresque únicamente el grupo afectado;
5. mantener las restricciones de solapamiento dentro de la transacción de base de datos.

## 8. Orden recomendado de implementación posterior

1. Definir el modelo canónico de jornadas y limpiar la ambigüedad con las tablas antiguas.
2. Implementar asistencia/recepción y pruebas de permisos.
3. Implementar movimiento individual e intercambio atómico.
4. Implementar incidencias operativas.
5. Exponer historial del grupo.
6. Crear el DTO agregado de torre y eventos en tiempo real.
7. Conectar las interacciones actualmente informativas del frontend.
8. Ejecutar pruebas de concurrencia con varias salas y coordinadores simultáneos.
