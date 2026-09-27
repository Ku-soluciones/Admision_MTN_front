# 🎯 PROMPT: Vincular Drafts de Postulación con Applications

## Contexto General
Cuando un apoderado crea un borrador de postulación de Prekínder, este debe estar vinculado a una `application` específica en el backend. Si cierra o retoma el borrador después, debe recuperar la misma `application` sin crear duplicados. El vínculo entre draft y application es la base para continuar sin perder identidad.

---

## Lo Que Debe Hacerse

### Crear la Application al Guardar el Primer Draft
- Cuando se guarda el primer draft de una postulación:
  - Backend crea una `application` nueva (tabla/entidad de applications)
  - Retorna el `applicationId` 
  - Frontend guarda este `applicationId` junto con los datos del draft
  
### Recuperar el ApplicationId en Guardados Posteriores
- Cuando el apoderado vuelve a guardar cambios:
  - Backend busca si ya existe `applicationId` para ese RUT
  - Si existe → usa el mismo `applicationId`
  - Si no existe → crea uno nuevo
  - Todos los cambios se guardan bajo la misma `application`

### Retomar el Draft
- Cuando el apoderado retoma un borrador:
  - Sistema recupera el `applicationId` guardado
  - Carga los datos del draft completo
  - No crea una nueva application
  - Si falla la recuperación → mostrar mensaje claro al usuario

### Manejo de Errores
- Si no se puede obtener el `applicationId` → mostrar: "No pudimos cargar tu borrador. Por favor, intenta de nuevo."
- Si hay conflicto (varios `applicationId` para un RUT) → mostrar: "Hay un problema con tu postulación. Contacta con soporte."
- Loguear errores en backend para investigar

---

## Casos de Uso

### ✅ CASO 1: Crear Application al Primer Draft
```
1. Apoderado llena etapas 1-3 y guarda
2. Backend crea application con id: "APP_12345"
3. Frontend recibe y almacena: { applicationId: "APP_12345", datos: {...} }
4. Usuario ve: "✓ Borrador guardado"
```

### ✅ CASO 2: Segundo Guardado Usa Misma Application
```
1. Apoderado continúa, llena etapas 4-5, guarda nuevamente
2. Backend busca applicationId para ese RUT
3. Encuentra "APP_12345" existente
4. Actualiza datos bajo la misma application (no crea nueva)
5. Frontend ve sin cambios: mismo applicationId
```

### ✅ CASO 3: Retomar Draft Sin Duplicados
```
1. Apoderado cierra navegador (sesión termina)
2. Retorna después de horas/días
3. Dashboard muestra: "Etapa 3 de 9 - CONTINUAR"
4. Clic en continuar → carga applicationId "APP_12345"
5. Recupera todos los datos guardados
6. No crea nueva application
```

### ✅ CASO 4: Error Controlado en Recuperación
```
1. Apoderado intenta retomar borrador
2. Backend no encuentra applicationId para su RUT (datos corruptos)
3. Sistema muestra: "No pudimos cargar tu borrador. Por favor, intenta de nuevo."
4. Opción: "Crear nueva postulación" o "Contactar soporte"
```

---

## Criterios de Aceptación

- ✅ Primer guardado crea una `application` y obtiene `applicationId`
- ✅ El `applicationId` se almacena correctamente (frontend/backend)
- ✅ Segundo guardado reutiliza el mismo `applicationId` (sin crear duplicado)
- ✅ Retomar borrador recupera el `applicationId` y los datos completos
- ✅ No hay duplicación de applications para un mismo RUT
- ✅ Errores de recuperación muestran mensajes claros (sin errores técnicos)
- ✅ System logs registran intentos fallidos para debugging

---

## ⚠️ IMPORTANTE: Restricciones

### 🚫 NO modificar:
- El sistema de borradores anterior (draft/submitted)
- Las validaciones de etapas
- El flujo de envío final
- Endpoints existentes que no sean necesarios

### ✅ Solo agregar:
- Campo `applicationId` al guardar/cargar draft
- Lógica de creación/búsqueda de application (backend)
- Recuperación de `applicationId` (frontend)

---

## Optimización Esperada

- Solución **más simple posible**: sin complejidad innecesaria
- Una sola query por guardado (buscar + actualizar en 1 operación)
- Sin llamadas extra a endpoints
- Sin campos redundantes en la BD

---

## Entregables

1. ✅ Estructura de `application` en BD (tabla/entidad)
2. ✅ Endpoint para crear/obtener `applicationId`
3. ✅ Lógica de vinculación RUT ↔ applicationId
4. ✅ Manejo de errores con mensajes claros
5. ✅ Tests: crear application, reutilizar, recuperar, errores

---

## 📋 ANTES DE DECIR "ESTÁ LISTO"

**Este trabajo DEBE pasar por revisión de 2 agentes:**

### Agente 1 - Revisión de Lógica
- Verifica que no hay duplicación de applications
- Confirma que el vínculo RUT ↔ applicationId es único
- Valida el manejo de errores

### Agente 2 - Revisión de Integración
- Verifica que no toca código anterior (drafts, validaciones, envío)
- Confirma que los endpoints nuevos no rompen existentes
- Valida que frontend y backend están sincronizados

Solo después de **ambas revisiones aprobadas**, se considera completo.

---

✅ Entregado: `vincular-drafts-con-applications.md`
