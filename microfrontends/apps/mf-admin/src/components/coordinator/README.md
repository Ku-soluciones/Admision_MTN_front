# Componentes del Coordinador

Componentes React para el dashboard y funcionalidades del Coordinador/Administrador del Sistema de Admisión MTN.

## Historias de Usuario Implementadas

### ✅ HU-001: Dashboard de Indicadores Generales
**Componente:** `CoordinatorDashboard.tsx`

Permite al coordinador/admin visualizar indicadores generales del proceso de admisión para tomar decisiones informadas.

**Características:**
- Total de postulaciones
- Tasa de aceptación
- Cupos disponibles (calculado automáticamente)
- Distribución por estado (gráfico de pastel)
- Distribución por nivel (gráfico de barras)
- Métricas de entrevistas (completadas/programadas)
- Evaluaciones pendientes
- Alertas del sistema
- Filtro por año académico
- Actualización manual de datos

**Endpoints utilizados:**
- `GET /api/dashboard/admin/detailed-stats?academicYear={year}`
- `GET /api/analytics/insights`

**Caché:** Los datos tienen TTL de 3-5 minutos en el backend

---

### ✅ HU-005: Visualizaciones Comparativas Año/Nivel
**Componente:** `TemporalTrendsView.tsx`

Permite visualizar comparativas de postulaciones por año/nivel para evaluar tendencias.

**Características:**
- Tendencia mensual (últimos 12 meses)
- Comparativa año vs año (selección múltiple)
- Gráficos de línea con tendencias
- Gráficos de barras comparativos
- Tasa de aceptación por año
- Métricas de crecimiento (growth rate)
- Tabla comparativa detallada

**Endpoints utilizados:**
- `GET /api/analytics/temporal-trends`
- `GET /api/dashboard/admin/detailed-stats?academicYear={year}`

**Caché:** Temporal trends tienen TTL de 15 minutos

---

### ✅ HU-008: Sistema de Búsqueda Avanzada
**Componente:** `AdvancedSearchView.tsx`

Sistema completo de búsqueda avanzada de postulantes con 20+ filtros.

**Características:**
- Búsqueda rápida por nombre o RUT
- 20+ filtros avanzados:
  - Estado (SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, WAITLIST, etc.)
  - Nivel/Grado educativo
  - Año académico
  - Colegio (Monte Tabor / Nazaret)
  - Necesidades especiales
  - Documentos completos
  - Y más...
- Paginación de resultados
- Ordenamiento personalizable
- Exportación a CSV
- Guardar búsquedas frecuentes (localStorage)
- Cargar búsquedas guardadas
- Tabla de resultados interactiva

**Endpoints utilizados:**
- `GET /api/applications/search` (con 20+ query params)
- `GET /api/applications/export` (para CSV)

---

## Uso

### Importación
```tsx
import {
  CoordinatorDashboard,
  TemporalTrendsView,
  AdvancedSearchView
} from '@/components/coordinator';
```

### Ejemplo de Routing (React Router)
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CoordinatorDashboard, TemporalTrendsView, AdvancedSearchView } from '@/components/coordinator';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/coordinator" element={<CoordinatorLayout />}>
          <Route index element={<CoordinatorDashboard />} />
          <Route path="trends" element={<TemporalTrendsView />} />
          <Route path="search" element={<AdvancedSearchView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Dependencias

### Instaladas
- ✅ `recharts` ^3.2.1 - Gráficos (Line, Bar, Pie)
- ✅ `@tanstack/react-query` ^5.90.2 - State management y cache
- ✅ `date-fns` ^4.1.0 - Formateo de fechas
- ✅ `react-router-dom` ^7.6.3 - Routing
- ✅ `axios` ^1.11.0 - HTTP requests

### API Clients
- ✅ `dashboardClient` - Para HU-001 y HU-005
- ✅ `searchClient` - Para HU-008

---

## Estructura de Archivos

```
src/components/coordinator/
├── CoordinatorDashboard.tsx    # HU-001: Dashboard principal
├── TemporalTrendsView.tsx      # HU-005: Análisis temporal
├── AdvancedSearchView.tsx      # HU-008: Búsqueda avanzada
├── index.ts                    # Exportaciones
└── README.md                   # Esta documentación
```

---

## Backend Endpoints Utilizados

### Dashboard Service (Port 8086)
- `GET /api/dashboard/stats` - Estadísticas generales (cache 5min)
- `GET /api/dashboard/admin/stats` - Estadísticas admin (cache 3min)
- `GET /api/dashboard/admin/detailed-stats?academicYear={year}` - Detallado con filtros
- `GET /api/analytics/dashboard-metrics` - Métricas consolidadas (cache 5min)
- `GET /api/analytics/status-distribution` - Distribución por estado (cache 10min)
- `GET /api/analytics/temporal-trends` - Tendencias mensuales (cache 15min)
- `GET /api/analytics/grade-distribution` - Distribución por grado
- `GET /api/analytics/insights` - Alertas del sistema

### Application Service (Port 8083)
- `GET /api/applications/search` - Búsqueda avanzada con 20+ filtros
- `GET /api/applications/export` - Exportar resultados a CSV

---

## Características Técnicas

### Manejo de Errores
- Todos los componentes manejan estados de loading y error
- Mensajes de error claros para el usuario
- Botón de reintentar en caso de fallo

### Performance
- Cache automático en backend (3-15 min TTL)
- Paginación en búsquedas (default: 20 resultados)
- Lazy loading de datos
- Optimistic updates

### UX
- Indicadores de carga (spinners)
- Estados vacíos informativos
- Alertas visuales con códigos de color
- Feedback inmediato en acciones

### Accesibilidad
- Componentes semánticos
- Labels descriptivos
- Contraste de colores adecuado
- Navegación por teclado

---

## Testing

### Backend (ya implementado)
Los endpoints tienen los siguientes tests disponibles:
```bash
# Test dashboard service
curl http://localhost:8080/api/dashboard/admin/detailed-stats?academicYear=2025

# Test search
curl "http://localhost:8080/api/applications/search?status=APPROVED&gradeApplied=1st&page=0&limit=10"

# Test temporal trends
curl http://localhost:8080/api/analytics/temporal-trends
```

### Frontend (recomendado)
```bash
# Unit tests (recomendado con Vitest)
npm run test

# E2E tests (recomendado con Playwright)
npm run e2e
```

---

## Próximas Mejoras

### Sugerencias de Implementación
1. **React Query Integration**: Agregar `useQuery` para cache automático en frontend
2. **Responsive Design**: Optimizar para tablets y móviles
3. **Dark Mode**: Soporte para tema oscuro
4. **Notificaciones Real-time**: WebSocket para alertas instantáneas
5. **Filtros Persistentes**: Guardar preferencias de filtros en backend
6. **Dashboard Widgets**: Hacer el dashboard personalizable (drag & drop)

---

## Soporte

Para problemas o consultas:
1. Revisar logs del backend: `/tmp/dashboard-service.log`
2. Verificar cache stats: `GET /api/dashboard/cache/stats`
3. Limpiar cache si es necesario: `POST /api/dashboard/cache/clear`

---

## Changelog

### v1.0.0 (2025-01-31)
- ✅ Implementación inicial de HU-001 (Dashboard)
- ✅ Implementación inicial de HU-005 (Tendencias)
- ✅ Implementación inicial de HU-008 (Búsqueda Avanzada)
- ✅ Integración con backend mock services
- ✅ Gráficos con Recharts
- ✅ Exportación CSV
- ✅ Búsquedas guardadas (localStorage)
