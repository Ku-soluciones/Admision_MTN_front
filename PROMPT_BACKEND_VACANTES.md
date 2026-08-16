
# Preguntas para el Backend - Vacantes por Género

## Contexto
Estamos separando las vacantes por género (M/F) en el sistema de admisiones. El frontend ya está preparado para enviar y recibir `hasVacancyM` y `hasVacancyF` en lugar del campo único `hasVacancy`.

---

## Preguntas sobre la Implementación

### 1. Base de Datos
- ¿Cuál es el nombre exacto de la tabla que almacena `grade_availability`?
- ¿Está en la misma DB del frontend o es un servicio separado?
- ¿Hay migraciones disponibles para cambiar el esquema?

### 2. Estructura de Datos
- ¿El cambio de `has_vacancy (boolean)` → `has_vacancy_m (boolean)` + `has_vacancy_f (boolean)` es directo o requiere nueva tabla?
- ¿Qué pasa con los datos existentes? ¿Se migrarán o se reinicializarán?

### 3. Endpoints
- ¿Cuáles archivos manejan los endpoints `/v1/grade-availability` (GET y PUT)?
- ¿Hay tests que cubran esta lógica que debamos actualizar?

### 4. Lógica de Postulación
- Cuando un alumno postula a un curso, ¿dónde se valida que hay vacante disponible?
- ¿El género del postulante ya está disponible en ese momento del flujo?
- ¿La validación actual es en el PUT de postulación o en un paso previo?

### 5. Flujo de Validación
```
Postulación → ¿Dónde se valida género? → ¿hasVacancyM o hasVacancyF?
```

---

## Respuesta Esperada del Backend

1. **确认ar tabla y esquema** exacto actual
2. **Confirmar plan de migración** (migrate datos existentes o no aplica)
3. **Identificar archivos** específicos a modificar
4. **Explicar dónde** se valida vacante durante postulación
5. **Disponibilidad** para implementar los cambios

---

## Recursos del Frontend

Ya está preparado para recibir el nuevo formato:

```typescript
// Tipos en frontend/src/packages/shared-ui/src/types/gradeAvailability.ts
interface GradeAvailability {
  gradeLevel: string;
  hasVacancyM: boolean;
  hasVacancyF: boolean;
}
```

```typescript
// Endpoints que el frontend llama:
GET  /v1/grade-availability         // Admin - obtener todos
PUT  /v1/grade-availability         // Admin - actualizar
GET  /v1/public/grade-availability // Público - verificar al postulan
```
