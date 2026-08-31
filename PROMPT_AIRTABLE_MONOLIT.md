# Prompt: Módulo Airtable-Style para Gestión de Datos (Monolito React)

## Contexto del Proyecto

Frontend monolítico en React 19 + TypeScript + Vite. Sistema de admisión escolar para Mount Carmel College (chile). El módulo Airtable debe integrarse como componente reutilizable dentro de esta aplicación.

---

## 1. Paleta de Colores

```css
:root {
  /* Primary - Azul */
  --color-primary-50: #EFF6FF;
  --color-primary-100: #DBEAFE;
  --color-primary-200: #BFDBFE;
  --color-primary-300: #93C5FD;
  --color-primary-400: #60A5FA;
  --color-primary-500: #3B82F6;
  --color-primary-600: #2563EB;
  --color-primary-700: #1D4ED8;
  --color-primary-800: #1E40AF;
  --color-primary-900: #1E3A8A;

  /* Neutral - Grises */
  --color-neutral-50: #FAFAFA;
  --color-neutral-100: #F5F5F5;
  --color-neutral-200: #E5E5E5;
  --color-neutral-300: #D4D4D4;
  --color-neutral-400: #A3A3A3;
  --color-neutral-500: #737373;
  --color-neutral-600: #525252;
  --color-neutral-700: #404040;
  --color-neutral-800: #262626;
  --color-neutral-900: #171717;
  --color-neutral-950: #0A0A0A;

  /* Status */
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-cyan: #06B6D4;
  --color-teal: #14B8A6;
}
```

---

## 2. Tipografía

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

## 3. Estilo de Página

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER                                                     │
│  [Logo] [Nav: Postulaciones | Entrevistas | Evaluaciones]   │
├─────────────────────────────────────────────────────────────┤
│  PAGE TITLE + ACTIONS │
│  "Estudiantes" [+ Crear] [Importar] [⋮]  │
├─────────────────────────────────────────────────────────────┤
│  TOOLBAR                                                   │
│  [🔍 Buscar...] [Filtros ▼] [Agrupar ▼] [Columnas ▼]       │
├─────────────────────────────────────────────────────────────┤
│  TABLE                                                     │
│  ┌───┬────┬──────────┬────────┬────────┬──────────┬───────┐ │
│  │ ☑ │ ID │ Nombre │ Estado│ Curso │ Fecha │ ···   │ │
│  ├───┼────┼──────────┼────────┼────────┼──────────┼───────┤ │
│  │ ☑ │ 1  │ Juan P. │ ●     │ IV Med │ 12/01/26 │ ···   │ │
│  │ ☑ │ 2  │ María L │ ●     │ II Med │ 13/01/26 │ ···   │ │
│  └───┴────┴──────────┴────────┴────────┴──────────┴───────┘ │
├─────────────────────────────────────────────────────────────┤
│  PAGINATION │
│  [◀] [▶] 1-20 de 150 [20 ▼] │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Tipos de Campo (Cell Types)

| Tipo | Descripción | Comportamiento |
|------|-------------|----------------|
| `text` | Texto plano | Truncar con "..." si > ancho columna |
| `number` | Número | Alineación derecha, separador miles |
| `date` | Fecha | Formato DD/MM/YYYY, selector calendario |
| `select` | Dropdown | Opciones con colores, búsqueda inline |
| `checkbox` | Boolean | Toggle switch |
| `email` | Email | Click abre mailto: |
| `phone` | Teléfono | Formato +56 9 XXXX XXXX |
| `url` | Link | Texto truncado, abre en nueva pestaña |
| `attachment` | Archivo | Thumbnail + nombre + tamaño |
| `longText` | Texto largo | Truncar, expandir en modal |
| `formula` | Calculado | Fondo gris, no editable |

---

## 5. Funcionalidades Requeridas

### Core Grid
- [ ] Columnas redimensionables (drag resize)
- [ ] Columnas reordenables (drag & drop)
- [ ] Columnas ocultables (toggle)
- [ ] Frozen columns (izquierda)
- [ ] Row height: 40px
- [ ] Alternating row colors (opcional)
- [ ] Virtual scrolling para >500 registros
- [ ] Checkbox column para selección
- [ ] Bulk actions: eliminar, exportar

### Filtrado y Ordenamiento
- [ ] Filter bar con múltiples condiciones
- [ ] Operadores: contains, equals, >, <, between, is empty
- [ ] Lógica AND/OR entre condiciones
- [ ] Multi-column sort (shift+click)
- [ ] Indicador visual de dirección

### Búsqueda
- [ ] Global search (busca en todas las columnas)
- [ ] Debounce 300ms
- [ ] Highlight matches

### Paginación
- [ ] Page size: 20, 50, 100, 200
- [ ] Navegación: prev/next/first/last
- [ ] Total records display

### Import/Export
- [ ] Import from CSV/Excel
- [ ] Export to CSV/Excel/PDF
- [ ] Template download

### Edición
- [ ] Doble click: editar celda
- [ ] Enter: guardar, Escape: cancelar
- [ ] Tab: siguiente celda
- [ ] Validación en tiempo real
- [ ] Optimistic updates
- [ ] Modal de edición completa

---

## 6. Estados de UI

### Loading
```
- Skeleton rows (animación pulse)
- Spinner en acciones
```

### Empty State
```
┌─────────────────────────────────────┐
│                                     │
│           📭 No hay registros       │
│                                     │
│      [Crear primer registro]        │
│                                     │
└─────────────────────────────────────┘
```

### Error State
```
┌─────────────────────────────────────┐
│  ⚠️ Error al cargar datos           │
│           [Reintentar]             │
└─────────────────────────────────────┘
```

### Toast
```
┌─────────────────────────────────────┐
│  ✓ Guardado exitosamente       [✕]  │
└─────────────────────────────────────┘
```

---

## 7. Animaciones

```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--ease-out: cubic-bezier(0, 0, 0.2, 1);

/* Row hover */
tr:hover { background-color: var(--color-neutral-50); }

/* Cell edit mode */
:focus-within { box-shadow: inset 0 0 0 2px var(--color-primary-500); }

/* Modal */
.modal-enter { opacity: 0; transform: scale(0.95); }
.modal-enter-active { opacity: 1; transform: scale(1); transition: all 200ms; }
```

---

## 8. API / Interfaz del Componente

```typescript
interface GridColumn<T = any> {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'email' | 'phone' | 'url' | 'attachment' | 'longText' | 'formula';
  width?: number;
  frozen?: boolean;
  hidden?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  required?: boolean;
  options?: { value: string; label: string; color?: string }[];
  formula?: string;
  defaultValue?: T;
}

interface AirtableGridProps<T = any> {
  columns: GridColumn<T>[];
  data: T[];

  // Callbacks
  onRecordsUpdate?: (records: T[]) => void;
  onRecordCreate?: (record: Partial<T>) => Promise<T>;
  onRecordUpdate?: (id: string | number, record: Partial<T>) => Promise<T>;
  onRecordDelete?: (id: string | number) => Promise<void>;
  onRecordsDelete?: (ids: (string | number)[]) => Promise<void>;
  onImport?: (data: T[]) => Promise<{ success: number; errors: string[] }>;
  onExport?: (records: T[], format: 'csv' | 'xlsx' | 'pdf') => Promise<Blob>;

  // Eventos
  onRowClick?: (record: T) => void;
  onSelectionChange?: (records: T[]) => void;
  onSortChange?: (column: string, direction: 'asc' | 'desc') => void;
  onFilterChange?: (filters: FilterCondition[]) => void;
  onPageChange?: (page: number, pageSize: number) => void;

  // Config
  title?: string;
  emptyMessage?: string;
  loading?: boolean;
  error?: string;
  showCheckbox?: boolean;
  showRowNumbers?: boolean;
  frozenColumns?: number;
  toolbarActions?: React.ReactNode;
  rowActions?: (record: T) => React.ReactNode;
}

interface FilterCondition {
  column: string;
  operator: 'contains' | 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'is_empty' | 'is_not_empty';
  value: any;
  logic?: 'AND' | 'OR';
}
```

---

## 9. Dependencias

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "typescript": "^5.0.0",
    "@tanstack/react-table": "^8.0.0",
    "@tanstack/react-virtual": "^3.0.0",
    "date-fns": "^4.0.0",
    "lucide-react": "^0.540.0",
    "clsx": "^2.0.0",
    "xlsx": "^0.18.5",
    "papaparse": "^5.4.0",
    "react-hot-toast": "^2.4.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

---

## 10. Estructura de Archivos

```
src/
├── components/
│   └── AirtableGrid/
│       ├── AirtableGrid.tsx
│       ├── AirtableGridHeader.tsx
│       ├── AirtableGridToolbar.tsx
│       ├── AirtableGridTable.tsx
│       ├── AirtableGridRow.tsx
│       ├── AirtableGridCell.tsx
│       ├── AirtableGridCellEditor.tsx
│       ├── AirtableGridPagination.tsx
│       ├── AirtableGridEmpty.tsx
│       ├── AirtableGridLoading.tsx
│       ├── AirtableGridModal.tsx
│       ├── AirtableGridFilter.tsx
│       ├── useAirtableGrid.ts
│       ├── useAirtableGridSelection.ts
│       ├── useAirtableGridSort.ts
│       ├── useAirtableGridFilter.ts
│       ├── types.ts
│       ├── constants.ts
│       ├── utils.ts
│       └── index.ts
```

---

## 11. Ejemplo de Uso

```tsx
import { AirtableGrid } from '@/components/AirtableGrid';
import type { GridColumn } from '@/components/AirtableGrid/types';

interface Student {
  id: number;
  rut: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  grade: string;
}

const columns: GridColumn<Student>[] = [
  { id: 'rut', name: 'RUT', type: 'text', width: 120, sortable: true, filterable: true },
  { id: 'firstName', name: 'Nombre', type: 'text', width: 150, sortable: true },
  { id: 'lastName', name: 'Apellido', type: 'text', width: 150, sortable: true },
  { id: 'birthDate', name: 'Fecha Nac.', type: 'date', width: 120 },
  {
    id: 'status',
    name: 'Estado',
    type: 'select',
    width: 120,
    options: [
      { value: 'PENDING', label: 'Pendiente', color: '#F59E0B' },
      { value: 'IN_REVIEW', label: 'En Revisión', color: '#3B82F6' },
      { value: 'APPROVED', label: 'Aprobado', color: '#22C55E' },
      { value: 'REJECTED', label: 'Rechazado', color: '#EF4444' },
    ]
  },
  { id: 'grade', name: 'Curso', type: 'text', width: 100 },
];

const StudentsPage = () => {
  const [students, setStudents] = useState<Student[]>([]);

  return (
    <AirtableGrid
      columns={columns}
      data={students}
      title="Estudiantes"
      onRecordsUpdate={setStudents}
      onRecordCreate={api.createStudent}
      onRecordUpdate={api.updateStudent}
      onRecordDelete={api.deleteStudent}
      onRowClick={(s) => navigate(`/students/${s.id}`)}
      showCheckbox
      showRowNumbers
      frozenColumns={1}
    />
  );
};
```

---

## 12. Prompt Final para Copiar

```
Create a complete Airtable-style data grid module in React 19 with TypeScript.

PROJECT CONTEXT: Monolithic React app (not microfrontends), school admission system for a Chilean school.

COLOR PALETTE:
- Primary blue: #3B82F6 (hover: #2563EB)
- Neutral grays: #FAFAFA to #0A0A0A
- Success: #22C55E, Warning: #F59E0B, Error: #EF4444
- Accent: #06B6D4 (cyan), #14B8A6 (teal)

TYPOGRAPHY:
- Font: Inter, system-ui, sans-serif
- Sizes: 12/14/16/18/20/24px
- Weights: 400/500/600/700

FEATURES:
1. Table/Grid with sortable, filterable, resizable columns
2. Column types: text, number, date, select, checkbox, email, phone, url, attachment, longText, formula
3. Inline cell editing (double-click, Enter to save, Escape to cancel, Tab to next)
4. Pagination:20/50/100/200 per page
5. Global search with 300ms debounce
6. Multi-column sort (shift+click)
7. Checkbox column for bulk selection
8. Bulk actions: delete, export (CSV/Excel/PDF)
9. Import from CSV/Excel
10. Column visibility toggle and reorder
11. Frozen (pinned) columns on left
12. Virtual scrolling for >500 rows
13. Empty state, loading skeleton, error state
14. Toast notifications
15. Full keyboard navigation (Tab, Enter, Escape, Arrow keys, Space)

API INTERFACE:
- columns: GridColumn[] with id, name, type, width, frozen, hidden, sortable, filterable, editable, options
- data: array of records
- Callbacks: onRecordsUpdate, onRecordCreate, onRecordUpdate, onRecordDelete, onRecordsDelete, onImport, onExport
- Events: onRowClick, onSelectionChange, onSortChange, onFilterChange, onPageChange

DEPENDENCIES: react@19, @tanstack/react-table, @tanstack/react-virtual, date-fns, lucide-react, xlsx, papaparse, react-hot-toast

DESIGN: Clean minimal UI. Row height 40px. Hover rows with light gray. Edit mode shows blue outline. Toast slides from top-right. Modal scales in with fade.

RESPONSIVE: Desktop full grid, tablet horizontal scroll, mobile stacked cards.

Create complete module with all files, TypeScript types, hooks, and working example.
```