# Base de Datos - Sistema de Admisión MTN

Este directorio contiene todos los archivos necesarios para configurar la base de datos del Sistema de Admisión del Colegio Monte Tabor y Nazaret.

## 📁 Archivos Incluidos

### 1. `schema.sql`
- **Schema completo de la base de datos**
- Todas las tablas, relaciones, índices y triggers
- Datos iniciales mínimos (materias, niveles, usuario admin)
- Vistas para reportes
- Sistema de auditoría

### 2. `sample_data.sql`
- **Datos de ejemplo para desarrollo y testing**
- Profesores completos con asignaciones
- Familias y estudiantes de muestra
- Exámenes completados listos para evaluación
- Materiales de estudio
- Configuraciones del sistema

### 3. `schema_documentation.md`
- **Documentación técnica completa**
- Descripción de todas las tablas
- Diagramas de relaciones
- Explicación de índices y optimizaciones
- Guías de uso

### 4. `README.md` (este archivo)
- **Guía de instalación y uso**

---

## 🚀 Instalación Rápida

### Requisitos Previos
- MySQL 8.0+ o MariaDB 10.5+
- Cliente MySQL (mysql, phpMyAdmin, etc.)
- Permisos para crear bases de datos

### Pasos de Instalación

```bash
# 1. Conectar a MySQL
mysql -u root -p

# 2. Crear la base de datos
CREATE DATABASE mtn_admisiones CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 3. Usar la base de datos
USE mtn_admisiones;

# 4. Ejecutar el schema principal
SOURCE schema.sql;

# 5. (Opcional) Cargar datos de ejemplo
SOURCE sample_data.sql;

# 6. Verificar instalación
SHOW TABLES;
SELECT COUNT(*) as profesores FROM professors;
```

### Instalación con Docker

```bash
# 1. Crear contenedor MySQL
docker run --name mtn-mysql \
  -e MYSQL_ROOT_PASSWORD=admin123 \
  -e MYSQL_DATABASE=mtn_admisiones \
  -p 3306:3306 \
  -d mysql:8.0

# 2. Esperar que inicie el contenedor
sleep 30

# 3. Ejecutar scripts
docker exec -i mtn-mysql mysql -uroot -padmin123 mtn_admisiones < schema.sql
docker exec -i mtn-mysql mysql -uroot -padmin123 mtn_admisiones < sample_data.sql
```

---

## Usuarios y Accesos

### Usuario Administrador Principal
```
Email: jorge.gangale@mtn.cl
Contraseña: profesor123 (hash en BD)
Permisos: Administrador completo
Materias: Matemática
Niveles: 8° Básico a 4° Medio
```

### Otros Profesores de Ejemplo
```
maria.gonzalez@mtn.cl - Matemática (PK-2°B)
carlos.ruiz@mtn.cl - Lenguaje (PK-3°B)
jennifer.thompson@mtn.cl - Inglés (PK-4°B)
eduardo.hernandez@mtn.cl - Matemática (7°B-2°M)
```

---

## Estructura de Datos

### Tablas Principales

| Tabla | Descripción | Registros Ejemplo |
|-------|-------------|------------------|
| `professors` | Profesores del sistema | 10 profesores |
| `students` | Estudiantes/postulantes | 8 estudiantes |
| `families` | Familias postulantes | 8 familias |
| `applications` | Postulaciones de admisión | 8 postulaciones |
| `student_exams` | Exámenes rendidos | 7 exámenes |
| `exam_schedules` | Horarios de exámenes | 9 horarios |
| `study_materials` | Material de estudio | 7 materiales |
| `curriculum_topics` | Temas del currículum | 12 temas |

### Datos Listos para Probar

#### Exámenes Pendientes de Evaluación (Jorge Gangale):
- **Nicolás Mendoza** (8° Básico) - Matemática: 22/30 pts
- **Camila Espinoza** (1° Medio) - Matemática: 28/35 pts  
- **Martina Pérez** (2° Medio) - Matemática: 26/35 pts
- **Sebastián Morales** (3° Medio) - Matemática: 30/40 pts
- **Fernanda Castillo** (4° Medio) - Matemática: 24/40 pts

---

## Consultas Útiles

### Verificar Instalación
```sql
-- Ver todas las tablas
SHOW TABLES;

-- Contar registros por tabla
SELECT 'professors' as tabla, COUNT(*) as registros FROM professors
UNION ALL SELECT 'students', COUNT(*) FROM students
UNION ALL SELECT 'families', COUNT(*) FROM families
UNION ALL SELECT 'applications', COUNT(*) FROM applications;

-- Ver exámenes pendientes para Jorge
SELECT se.id, s.first_name, s.last_name, se.score, se.max_score
FROM student_exams se
JOIN students s ON se.student_id = s.id
WHERE se.subject_id = 'MATH' 
  AND se.status = 'COMPLETED'
  AND se.id NOT IN (SELECT exam_id FROM exam_evaluations);
```

### Estadísticas Rápidas
```sql
-- Usar las vistas creadas
SELECT * FROM v_professor_stats;
SELECT * FROM v_students_complete;
SELECT * FROM v_exams_with_evaluations;
```

---

## 🛠️ Configuración para Desarrollo

### Variables de Entorno Sugeridas
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mtn_admisiones
DB_USER=mtn_user
DB_PASSWORD=secure_password
DB_CHARSET=utf8mb4
```

### Usuario de Base de Datos para la Aplicación
```sql
-- Crear usuario específico para la aplicación
CREATE USER 'mtn_app'@'localhost' IDENTIFIED BY 'app_password_2024';

-- Otorgar permisos necesarios
GRANT SELECT, INSERT, UPDATE, DELETE ON mtn_admisiones.* TO 'mtn_app'@'localhost';

-- Para procedimientos y triggers
GRANT EXECUTE ON mtn_admisiones.* TO 'mtn_app'@'localhost';

FLUSH PRIVILEGES;
```

---

## 📈 Rendimiento y Optimización

### Índices Creados
- **Búsquedas por estudiante**: `idx_students_grade`, `idx_students_family`
- **Filtros de exámenes**: `idx_student_exams_status`, `idx_student_exams_subject`
- **Evaluaciones por profesor**: `idx_evaluations_professor`
- **Horarios**: `idx_exam_schedules_date`

### Monitoreo de Rendimiento
```sql
-- Consultas lentas
SHOW PROCESSLIST;

-- Uso de índices
EXPLAIN SELECT * FROM student_exams WHERE status = 'COMPLETED';

-- Tamaño de tablas
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS "Size (MB)"
FROM information_schema.TABLES 
WHERE table_schema = 'mtn_admisiones'
ORDER BY (data_length + index_length) DESC;
```

---

## 🔒 Seguridad

### Recomendaciones de Producción

1. **Contraseñas**: Cambiar todas las contraseñas por defecto
2. **SSL**: Configurar conexiones SSL para producción
3. **Firewall**: Restringir acceso a puertos de BD
4. **Backups**: Configurar respaldos automáticos
5. **Logs**: Habilitar logs de auditoría

### Script de Backup
```bash
#!/bin/bash
# backup_mtn.sh

DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p mtn_admisiones > backup_mtn_$DATE.sql
gzip backup_mtn_$DATE.sql
echo "Backup creado: backup_mtn_$DATE.sql.gz"
```

---

## 🐛 Solución de Problemas

### Error: "Table doesn't exist"
```sql
-- Verificar que las tablas se crearon
SHOW TABLES LIKE 'professors';

-- Recrear si es necesario
SOURCE schema.sql;
```

### Error: "Foreign key constraint fails"
```sql
-- Verificar integridad referencial
SELECT * FROM professors WHERE id = 'PROF-001';

-- Deshabilitar temporalmente (solo desarrollo)
SET FOREIGN_KEY_CHECKS = 0;
-- ... operaciones ...
SET FOREIGN_KEY_CHECKS = 1;
```

### Error: "Character set issues"
```sql
-- Verificar charset
SHOW CREATE DATABASE mtn_admisiones;

-- Convertir si es necesario
ALTER DATABASE mtn_admisiones CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 📞 Soporte

Para problemas con la base de datos:

1. **Revisar logs**: `/var/log/mysql/error.log`
2. **Consultar documentación**: `schema_documentation.md`
3. **Verificar permisos**: Usuario y contraseñas
4. **Comprobar conexión**: Ping a servidor de BD

---

## Próximos Pasos

Una vez instalada la base de datos:

1. **Configurar la aplicación backend** con las credenciales de BD
2. **Probar conexión** desde la aplicación
3. **Ejecutar migraciones** si se usan ORMs
4. **Configurar backups** automáticos
5. **Implementar monitoreo** de rendimiento

¡La base de datos está lista para el Sistema de Admisión MTN! 🚀