# Documentación del Schema de Base de Datos
## Sistema de Admisión - Colegio Monte Tabor y Nazaret

### Tabla de Contenidos
1. [Resumen General](#resumen-general)
2. [Estructura de Tablas](#estructura-de-tablas)
3. [Relaciones](#relaciones)
4. [Índices y Optimización](#índices-y-optimización)
5. [Triggers y Auditoría](#triggers-y-auditoría)
6. [Vistas](#vistas)
7. [Datos Iniciales](#datos-iniciales)

---

## Resumen General

El schema está diseñado para manejar un sistema completo de admisión escolar que incluye:
- **Gestión de profesores** con asignación por materias y niveles
- **Sistema de postulaciones** de estudiantes y familias
- **Portal de exámenes** con evaluación detallada
- **Contenido educativo** adaptado por nivel
- **Auditoría completa** de todas las acciones
- **Permisos de administrador** para gestión del sistema

---

## Estructura de Tablas

### **1. Usuarios y Autenticación**

#### `professors`
Tabla principal de profesores con autenticación y permisos.
```sql
- id (VARCHAR(20), PK): Identificador único del profesor
- email (VARCHAR(255), UNIQUE): Email institucional (@mtn.cl)
- password_hash (VARCHAR(255)): Hash seguro de la contraseña
- is_admin (BOOLEAN): Permisos de administrador (solo Jorge Gangale)
- department (VARCHAR(100)): Departamento académico
```

#### `subjects`
Materias disponibles en el sistema.
```sql
- id (VARCHAR(20), PK): MATH, SPANISH, ENGLISH
- name (VARCHAR(100)): Nombre completo de la materia
```

#### `grade_levels`
Niveles educativos del colegio.
```sql
- id (VARCHAR(20), PK): prekinder, kinder, 1basico, etc.
- name (VARCHAR(50)): Pre-Kínder, 1° Básico, etc.
- level_order (INT): Para ordenamiento (1-14)
```

#### `professor_subjects` & `professor_grade_assignments`
Tablas de relación para asignar materias y niveles a profesores.

### **2. Postulantes y Familias**

#### `families`
Información de las familias postulantes.
```sql
- id (VARCHAR(20), PK): Identificador único
- contact_email (VARCHAR(255)): Email de contacto principal
- address (TEXT): Dirección familiar
```

#### `students`
Estudiantes/postulantes al colegio.
```sql
- id (VARCHAR(20), PK): Identificador único
- rut (VARCHAR(12), UNIQUE): RUT chileno
- grade_level_id (FK): Nivel al que postula
- family_id (FK): Familia a la que pertenece
```

#### `applications`
Postulaciones de admisión.
```sql
- status (ENUM): DRAFT, SUBMITTED, INTERVIEW_SCHEDULED, ACCEPTED, REJECTED, WAITLIST
- admission_year (YEAR): Año de admisión
- interview_date (TIMESTAMP): Fecha de entrevista
```

#### `application_documents`
Documentos requeridos para cada postulación.
```sql
- document_type (VARCHAR(50)): Tipo de documento
- status (ENUM): pending, submitted, approved, rejected
- file_path (VARCHAR(500)): Ruta del archivo subido
```

### **3. Exámenes y Evaluaciones**

#### `exam_schedules`
Horarios disponibles para rendir exámenes.
```sql
- subject_id (FK): Materia del examen
- grade_level_id (FK): Nivel educativo
- exam_date (DATE): Fecha del examen
- max_capacity (INT): Cupos disponibles
```

#### `student_exams`
Exámenes rendidos por estudiantes.
```sql
- status (ENUM): NOT_STARTED, SCHEDULED, IN_PROGRESS, COMPLETED, MISSED
- score (DECIMAL): Puntaje obtenido
- time_spent_minutes (INT): Tiempo empleado
```

#### `exam_evaluations`
Evaluaciones detalladas realizadas por profesores.
```sql
- score/percentage/grade: Calificación cuantitativa
- exam_adaptation (TEXT): Cómo se adaptó al examen
- behavior_observations (TEXT): Comportamiento durante el examen
- general_comments (TEXT): Comentarios generales
- recommendations (TEXT): Recomendaciones
- requires_follow_up (BOOLEAN): Si requiere seguimiento
```

#### Tablas de Evaluación Cualitativa:
- **`evaluation_strengths`**: Fortalezas del estudiante
- **`evaluation_weaknesses`**: Debilidades/áreas a mejorar
- **`evaluation_improvement_areas`**: Elementos específicos a mejorar
- **`evaluation_area_scores`**: Puntajes por área específica

### **4. Contenido Educativo**

#### `study_materials`
Materiales de estudio por materia y nivel.
```sql
- material_type (ENUM): pdf, video, link, document
- file_path/url: Ubicación del contenido
- is_downloadable (BOOLEAN): Si se puede descargar
```

#### `curriculum_topics`
Temas del currículum por materia y nivel.
```sql
- topic_name (VARCHAR(300)): Nombre del tema
- topic_order (INT): Orden dentro del nivel
```

### ⚙️ **5. Sistema**

#### `system_settings`
Configuraciones generales del sistema.
```sql
- setting_key (VARCHAR(100)): Clave de configuración
- setting_value (TEXT): Valor
- setting_type (ENUM): string, number, boolean, json
```

#### `audit_logs`
Registro completo de todas las acciones del sistema.
```sql
- user_type (ENUM): professor, family, system
- action (VARCHAR(100)): Acción realizada
- old_values/new_values (JSON): Valores antes y después
```

---

## Relaciones Principales

```
families (1) ←→ (N) students
students (1) ←→ (N) applications
students (1) ←→ (N) student_exams
student_exams (1) ←→ (1) exam_evaluations
professors (N) ←→ (N) subjects [professor_subjects]
professors (N) ←→ (N) grade_levels [professor_grade_assignments]
```

---

## Índices y Optimización

### Índices Principales:
- **`idx_students_grade`**: Búsquedas por nivel educativo
- **`idx_student_exams_status`**: Filtros por estado de examen
- **`idx_evaluations_professor`**: Evaluaciones por profesor
- **`idx_exam_schedules_date`**: Programación de exámenes

### Optimizaciones:
- **Particionamiento** por año de admisión en `applications`
- **Índices compuestos** para consultas frecuentes
- **Foreign Keys** con `CASCADE` apropiado

---

## Triggers y Auditoría

### Triggers Implementados:
1. **`audit_exam_evaluations_update`**: Audita cambios en evaluaciones
2. **`audit_applications_update`**: Audita cambios de estado en postulaciones

### Beneficios:
- **Trazabilidad completa** de cambios
- **Seguridad** en modificaciones críticas
- **Compliance** con normativas educacionales

---

## Vistas Útiles

### `v_students_complete`
Vista consolidada de estudiantes con información familiar y de postulación.

### `v_exams_with_evaluations`
Exámenes con sus evaluaciones y datos del profesor evaluador.

### `v_professor_stats`
Estadísticas de rendimiento por profesor (exámenes totales, evaluados, pendientes, promedio).

---

## Datos Iniciales

### Materias Predefinidas:
- **MATH**: Matemática
- **SPANISH**: Lenguaje y Comunicación  
- **ENGLISH**: Inglés

### Niveles Educativos:
- **Pre-Kínder** a **4° Medio** (14 niveles totales)

### Usuario Administrador:
- **Jorge Gangale** (jorge.gangale@mtn.cl)
- Permisos completos de administrador
- Asignado a Matemática para niveles 8° Básico - 4° Medio

---

## Consideraciones de Seguridad

1. **Contraseñas**: Hasheadas con bcrypt
2. **Emails únicos**: Prevención de duplicados
3. **Auditoría completa**: Todas las acciones registradas
4. **Permisos por roles**: Separación profesor/administrador
5. **Validación de datos**: Constraints y triggers
6. **Soft deletes**: Preservación de datos históricos

---

## Escalabilidad

El schema está diseñado para:
- **Miles de postulaciones** anuales
- **Cientos de profesores** simultáneos
- **Múltiples años** de datos históricos
- **Expansión de materias** y niveles
- **Integración** con sistemas externos

---

## Comandos de Instalación

```sql
-- 1. Crear base de datos
CREATE DATABASE mtn_admisiones CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Usar la base de datos
USE mtn_admisiones;

-- 3. Ejecutar el schema completo
SOURCE schema.sql;

-- 4. Verificar instalación
SHOW TABLES;
SELECT COUNT(*) FROM professors WHERE is_admin = TRUE;
```