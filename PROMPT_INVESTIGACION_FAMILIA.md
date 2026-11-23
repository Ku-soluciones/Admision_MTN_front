# Investigacion: Seccion Entrevista Familiar en Ficha de Alumno

## Contexto
El usuario necesita agregar una seccion de "Entrevista Familiar" en la ficha del alumno que se abre desde la plataforma de admisiones K-IV Medio.

## URL de la aplicacion
- Frontend: `https://admisiones.dev.admitia.dedyn.io/admin?section=admision`
- Endpoint API Card: `https://admitia-nginx-staging.up.railway.app/v1/dashboard/applicants/{id}/card`

## Datos del alumno de prueba
- Application ID: 47
- Nombre: CLARA DE VICENTE DUARTE
- La respuesta del endpoint `/v1/dashboard/applicants/47/card` incluye:
```json
{
  "familyInterview": {
    "count": 1,
    "scores": [12.00],
    "percentage": 12.00
  }
}
```

## Requisito
Agregar una seccion accordion (desplegable) en la ficha del alumno que muestre:
1. **Estado colapsado**: Score de porcentaje (ej: "12% de puntaje") + nombre del entrevistador
2. **Estado expandido**: "Observacion cualitativa (Justificacion)" con el texto de la justificacion

## Estructura actual del proyecto
- **ApplicantCardModal**: Componente en `src/features/admin/components/admissionReports/ApplicantCardModal.tsx` - USADO en `AdmissionReportTabs.tsx` para la seccion de REPORTES
- **StudentDetailModal**: Componente en `src/features/admin/components/admin/StudentDetailModal.tsx` - USADO en `AdminDashboard.tsx` para la seccion `?section=admision`

## Puntos a investigar
1. Identificar CUAL modal se usa en `?section=admision` - el modal que usa la plataforma K-IV Medio
2. Verificar si los console.log en el modal elegido se ejecutan
3. Determinar si el problema es de renderizado, de datos, o de depliegue
4. Investigar que datos exactos trae la respuesta del API y si incluyen la justificacion
5. Considerar que pueden haber problemas de:
   - Cache del navegador
   - Deploy no actualizado en Vercel
   - Uso de modal incorrecto
   - Tipos de datos diferentes a los esperados

## Pasos para resolver
1. Primero identificar que modal se abre desde `?section=admision`
2. Agregar instrumentacion (console.log) minima para confirmar que el modal se ejecuta
3. Verificar que los datos de familyInterview vengan en la respuesta del API
4. Si no vienen, identificar que endpoint дополнительном se necesita llamar
5. Implementar la seccion de UI
6. Verificar que funcione en preproductivo antes de commit

## Importante
- Trabajar en el archivo correcto segun corresponda
- No hacer commit hasta verificar que funcione en preproductivo
- Usar agentes para investigar el flujo de datos
