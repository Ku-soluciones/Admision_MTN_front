# ARCHITECTURE.md - ApplicationForm.tsx

**Estado:** Baseline actual (no refactorizado)  
**Fecha:** 2026-04-25  
**Propósito:** Documentar arquitectura actual para mejora iterativa

## 1. ESTRUCTURA DE STEPS DEFINIDA VS. IMPLEMENTADA

### Definición declarada (líneas 19-29):
```
Paso 0: "Información del Postulante"
Paso 1: "Dirección del Postulante"
Paso 2: "Información del Colegio"
Paso 3: "Datos del Padre"
Paso 4: "Datos de la Madre"
Paso 5: "Sostenedor"
Paso 6: "Apoderado"
Paso 7: "Documentación"
Paso 8: "Confirmación"
```

### Implementación REAL en renderStepContent() (switch statement):
```
Case 0:  "Información del Postulante" + "Dirección del Postulante" + "Información del Colegio"
Case 1:  "Datos del Padre" + "Datos de la Madre" (AMBOS JUNTOS)
Case 2:  "Sostenedor"
Case 3:  "Apoderado"
Case 4:  "Documentación"
Case 5:  "Confirmación"
```

**PROBLEMA CRÍTICO:** 9 pasos definidos, 6 cases implementados. Case 0 contiene 3 pasos lógicos, Case 1 contiene 2.

---

## 2. DETALLES DE CADA CASE ACTUAL

### CASE 0: Megapaso del Postulante (líneas 1421-1702)
**Contiene TRES pasos definidos:**
- Información personal del estudiante
- Dirección segmentada en componentes
- Información geográfica + Nivel educativo + Colegio de procedencia + Año

**Campos:**
```
firstName, paternalLastName, maternalLastName, rut, birthDate, studentEmail,
studentAddressStreet, studentAddressNumber, studentAddressCommune, studentAddressApartment, 
studentAddress (combinado),
pais, region, comuna,
grade, currentSchool, applicationYear
```

### CASE 1: Ambos Padres Juntos (líneas 1703-1862)
**Contiene DOS pasos definidos:**
- Datos del Padre + Datos de la Madre (en un mismo formulario visual)

**Campos:**
```
parent1Name, parent1Rut, parent1Email, parent1Phone, parent1Address, parent1Profession,
parent2Name, parent2Rut, parent2Email, parent2Phone, parent2Address, parent2Profession
```

### CASE 2: Sostenedor (líneas 1863-1948)
**Contiene UN paso definido:**
- Parentesco + datos personales

**Campos renderizados:**
```
supporterRelation, supporterName, supporterRut, supporterEmail, supporterPhone
```

**PROBLEMA:** No renderiza `supporterAddress` aunque se valida.

### CASE 3: Apoderado (líneas 1949-2034)
**Contiene UN paso definido:**
- Parentesco + datos personales

**Campos renderizados:**
```
guardianRelation, guardianName, guardianRut, guardianEmail, guardianPhone
```

**PROBLEMA:** No renderiza `guardianAddress` aunque se valida.

### CASE 4: Documentación (líneas 2035-2174)
**Contiene UN paso definido:**
- Carga y gestión de archivos

**Documentos:**
```
BIRTH_CERTIFICATE (obligatorio)
GRADES_2023, GRADES_2024, GRADES_2025_SEMESTER_1 (obligatorios)
PERSONALITY_REPORT_2024, PERSONALITY_REPORT_2025_SEMESTER_1 (opcionales)
STUDENT_PHOTO, BAPTISM_CERTIFICATE, PREVIOUS_SCHOOL_REPORT, 
MEDICAL_CERTIFICATE, PSYCHOLOGICAL_REPORT (opcionales)
```

### CASE 5: Confirmación (líneas 2175-2210)
**Contiene UN paso definido:**
- Pantalla de resumen y confirmación

---

## 3. VALIDACIÓN POR STEP

**validateCurrentStep() (líneas 674-796):**

| Case | Validación | Campos Requeridos |
|------|-----------|-------------------|
| 0 | Extensiva (25+ validaciones) | firstName, paternalLastName, maternalLastName, rut, birthDate, grade, direcciones, ubicación, applicationYear, coherencia fecha-grado |
| 1 | Ambos padres completos | parent1/2: Name, Email, Phone, Rut, Address, Profession |
| 2 | Supporter completo | supporterName, Email, Phone, Rut, Relation |
| 3 | Guardian completo | guardianName, Email, Phone, Rut, Relation |
| 4+ | Siempre true | Ninguno |

**PROBLEMA:** La validación de Case 0 también valida campos que NO existen en renderizado: `schoolApplied`, `admissionPreference`.

---

## 4. ESTADO (data object)

El estado `data` contiene todos estos campos en un objeto plano:

```
// Grupo 1: Estudiante (6 campos)
firstName, paternalLastName, maternalLastName, rut, birthDate, studentEmail

// Grupo 2: Dirección Estudiante (5 campos)
studentAddress, studentAddressStreet, studentAddressNumber, 
studentAddressCommune, studentAddressApartment

// Grupo 3: Ubicación (3 campos)
pais, region, comuna

// Grupo 4: Colegio (3 campos)
grade, currentSchool, applicationYear

// Grupo 5: Padre 1 (6 campos)
parent1Name, parent1Rut, parent1Email, parent1Phone, parent1Address, parent1Profession

// Grupo 6: Padre 2 (6 campos)
parent2Name, parent2Rut, parent2Email, parent2Phone, parent2Address, parent2Profession

// Grupo 7: Sostenedor (5 campos)
supporterName, supporterRut, supporterEmail, supporterPhone, supporterRelation, supporterAddress

// Grupo 8: Apoderado (5 campos)
guardianName, guardianRut, guardianEmail, guardianPhone, guardianRelation, guardianAddress

// Grupo 9: Documentos (2 campos)
uploadedDocuments (Map), existingDocuments (Array)
```

**TOTAL: ~45+ campos en un objeto sin estructura jerárquica.**

---

## 5. FLUJO DE DATOS

```
User Input
  ↓
updateField(name, value)  [línea 150]
  ↓
setData({...prev, [name]: value})
  ↓
state.data[fieldName]
  ↓
Form component.value={data.fieldName}
```

**Conversiones automáticas:**
- 17 campos en uppercase (nombres, direcciones, profesiones)
- `studentAddress` se combina cuando sus componentes cambian

---

## 6. NAVEGACIÓN ENTRE STEPS

**nextStep() (líneas 810-848):**
1. Valida step actual con `validateCurrentStep()`
2. Si válido, incrementa `currentStep`
3. **EXCEPCIÓN:** Si `isAddingAnotherChild=true` y `step=0` → salta a step 4 (evita pasos 1,2,3)

**prevStep() (línea 850):**
- Simplemente decrementa `currentStep`

---

## 7. PROBLEMAS IDENTIFICADOS

### PROBLEMA 1: Desalineación Step Titles vs. Implementación
- Se definen 9 pasos, se implementan 6 cases
- Case 0 combina 3 pasos lógicos
- Case 1 combina 2 pasos lógicos
- Barra de progreso muestra 9 pasos pero la UX es confusa

### PROBLEMA 2: Falta de Dirección en Sostenedor y Apoderado
- `supporterAddress` no se renderiza en Case 2
- `guardianAddress` no se renderiza en Case 3
- Pero se referencian en validación y en otros lugares

### PROBLEMA 3: Validación Centralizada sin Separación
- `validateCurrentStep()` mezcla múltiples conceptos en Case 0
- Referencia campos que NO existen: `schoolApplied`, `admissionPreference`
- Validación difícil de mantener y testear

### PROBLEMA 4: Estado Plano sin Estructura
- 45+ campos en un solo objeto `data`
- Sin agrupación lógica
- Difícil rastrear dependencias
- Propenso a errores de nombres

### PROBLEMA 5: Lógica Condicional Dispersa
- Campos condicionales esparcidos en JSX
- `requiresCurrentSchool()` determina requeridos
- Coherencia fecha-grado validada en múltiples lugares

### PROBLEMA 6: Campos "Fantasma"
- `studentAddress` es un campo combinado que se actualiza indirectamente
- Se usa en validación como si fuera un campo directo
- Confunde lógica de sincronización

### PROBLEMA 7: Inconsistencias en Renderizado
- 6 cases pero se declaran 9 pasos
- El usuario ve 9 pasos en la barra de progreso
- Algunos pasos son "virtuales" (contenidos en otros cases)

---

## 8. ARCHIVOS INVOLUCRADOS

**Primarios:**
- `/pages/ApplicationForm.tsx` (2363 líneas) - Componente monolítico
- `/types.ts` - Tipos base
- `/context/AppContext.ts` - Gestión de aplicaciones
- `/context/AuthContext.ts` - Autenticación

**Servicios:**
- `/services/applicationService.ts`
- `/services/documentService.ts`
- `/services/profileService.ts`
- `/services/staticData.ts`

**Componentes UI:**
- `/components/ui/Input.tsx`
- `/components/ui/RutInput.tsx`
- `/components/ui/Select.tsx`
- `/components/ui/Button.tsx`

---

## 9. DIAGRAMA DE FLUJO ACTUAL

```
┌──────────────────────────────────────┐
│      ApplicationForm.tsx             │
└──────────────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
   ┌────▼──────┐         ┌───▼────────────┐
   │showAuthForm│       │isAuthenticated  │
   │(login/reg) │       │(form rendering) │
   └─────────────┘       └────────┬───────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
        ┌─────▼──────┐                    ┌────────▼──────────┐
        │ Progress    │                    │renderStepContent()│
        │ Bar (9)     │                    │   (6 cases)       │
        └─────────────┘                    └────────┬──────────┘
                                                    │
      ┌─────────────┬──────────┬──────────┬────────┼────────┬──────────┬─────────┐
      │             │          │          │        │        │          │         │
   ┌──▼───┐     ┌───▼──┐  ┌───▼──┐  ┌───▼──┐  ┌──▼──┐  ┌────▼──┐  ┌──▼───┐  ┌─▼──┐
   │Case 0│     │Case 1│  │Case 2│  │Case 3│  │Case 4│  │Case 5 │  │Btn   │  │Nav │
   │[3 in]│     │[2 in]│  │      │  │      │  │      │  │       │  │      │  │    │
   └──┬───┘     └───┬──┘  └───┬──┘  └───┬──┘  └──┬───┘  └───┬────┘  └──┬───┘  └─┬──┘
      │             │         │        │         │          │         │      │
   Post+Dir+   Father+    Supporter Guardian  Documents  Confirm next() validate()
   School     Mother
   
   All → state.data (45+ fields)
   updateField() on every change
   validateCurrentStep() before navigation
```

---

## 10. MAPEO ACTUAL COMPLETO

```
DECLARED STEPS          ACTUAL IMPLEMENTATION       FIELDS RENDERED
══════════════════      ═══════════════════════════════════════════════

Paso 0: Postulante  →   CASE 0:                 firstName
                        Postulant +             paternalLastName
Paso 1: Dirección   →   Direction +             maternalLastName
                        School                  rut, birthDate, studentEmail
Paso 2: Colegio     →   (3 pasos en 1)          studentAddressStreet/Number/Commune/Apartment
                                                pais, region, comuna
                                                grade, currentSchool, applicationYear

Paso 3: Padre       →   CASE 1:                 parent1Name/Rut/Email/Phone/Address/Profession
Paso 4: Madre       →   Father + Mother         parent2Name/Rut/Email/Phone/Address/Profession
                        (2 pasos en 1)          

Paso 5: Sostenedor  →   CASE 2:                 supporterRelation
                        Supporter (1 paso)      supporterName/Rut/Email/Phone

Paso 6: Apoderado   →   CASE 3:                 guardianRelation
                        Guardian (1 paso)       guardianName/Rut/Email/Phone

Paso 7: Documentación → CASE 4:                 uploadedDocuments, existingDocuments
                        Documents (1 paso)      [11 document types]

Paso 8: Confirmación →  CASE 5:                 [No form fields]
                        Confirm (1 paso)
```

---

## CONCLUSIÓN

**Desajuste fundamental:** 9 pasos presentados, 6 cases implementados.

**Consecuencias:**
1. Confusión visual - Barra muestra 9 pero UX tiene 6
2. Validación compleja - Múltiples pasos en una función
3. Mantenibilidad reducida - Difícil separar y debuggear
4. Estado no estructurado - 45+ campos sin agrupación
5. Inconsistencias - Campos faltantes (direcciones)
6. Campos "fantasma" - `studentAddress` se actualiza indirectamente

---

**NEXT STEP:** Refactorización para alinear casos con pasos (9 cases verdaderos).
