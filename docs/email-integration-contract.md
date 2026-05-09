# Contrato de Integración de Email - Frontend

> Basado en: `admitia-bff/EMAIL_ENDPOINTS.md`
> Versión: 2.0 - Con patrón Composer (Strategy + Registry)
> Fecha: 2024

## Resumen

El sistema de email ahora usa el **patrón Composer** donde el frontend envía:
- `template`: Identificador del enum `EmailTemplate` (obligatorio)
- `to`: Destinatario
- `data`: Variables para el template

El backend (BFF) se encarga de:
1. Validar el template contra el enum
2. Resolver el renderer desde el EmailTemplateRegistry
3. Renderizar HTML con el layout institucional
4. Enviar vía Resend
5. Persistir en tabla `notifications`

## Enum EmailTemplate

```typescript
// AUTH
WELCOME = 'WELCOME'
EMAIL_VERIFICATION = 'EMAIL_VERIFICATION'
PASSWORD_RESET = 'PASSWORD_RESET'
PASSWORD_CHANGED = 'PASSWORD_CHANGED'
USER_INVITATION = 'USER_INVITATION'

// APPLICATION
APPLICATION_RECEIVED = 'APPLICATION_RECEIVED'
DOCUMENT_REVIEW = 'DOCUMENT_REVIEW'
DOCUMENT_REMINDER = 'DOCUMENT_REMINDER'
STATUS_UPDATE = 'STATUS_UPDATE'
ADMISSION_RESULT = 'ADMISSION_RESULT'

// INTERVIEW
INTERVIEW_INVITATION = 'INTERVIEW_INVITATION'
INTERVIEW_RESCHEDULED = 'INTERVIEW_RESCHEDULED'
INTERVIEW_CANCELLED = 'INTERVIEW_CANCELLED'
INTERVIEW_SUMMARY = 'INTERVIEW_SUMMARY'

// EVALUATION
EVALUATION_ASSIGNMENT = 'EVALUATION_ASSIGNMENT'
EVALUATION_COMPLETED = 'EVALUATION_COMPLETED'
EVALUATION_RESCHEDULED = 'EVALUATION_RESCHEDULED'
EVALUATION_CANCELLED = 'EVALUATION_CANCELLED'

// SYSTEM
GENERIC = 'GENERIC'
TEST = 'TEST'
```

## Payloads

### EmailPayload (Principal)
```typescript
interface EmailPayload {
  template: EmailTemplate | string;  // OBLIGATORIO
  to: string;                          // OBLIGATORIO
  data?: Record<string, any>;          // Variables del template
  subject?: string;                    // Override (opcional)
  recipientType?: 'APPLICATION' | 'USER' | 'INTERVIEW' | 'EVALUATION';
  recipientId?: number | string;
}
```

### InstitutionalEmailPayload
```typescript
interface InstitutionalEmailPayload {
  template: EmailTemplate | string;    // OBLIGATORIO
  data?: {
    newStatus?: string;
    pendingDocuments?: string;
    result?: string;
    message?: string;
    approvedDocuments?: string[];
    rejectedDocuments?: string[];
    allApproved?: boolean;
    [key: string]: any;
  };
  subject?: string;
}
```

## Servicios Actualizados

### 1. `emailService.ts` - Envío Directo

```typescript
import { emailService, EmailTemplate } from './services';

// Enviar email con template
await emailService.sendTemplatedEmail({
  template: EmailTemplate.APPLICATION_RECEIVED,
  to: 'apoderado@ejemplo.cl',
  data: {
    studentName: 'Juan Pérez',
    applicationId: 123
  }
});

// Enviar en lote
await emailService.sendBulkEmails({
  recipients: [
    { template: EmailTemplate.STATUS_UPDATE, to: 'user1@test.cl', data: { newStatus: 'APPROVED' } },
    { template: EmailTemplate.STATUS_UPDATE, to: 'user2@test.cl', data: { newStatus: 'REJECTED' } }
  ]
});

// Métodos de conveniencia
await emailService.sendWelcomeEmail(to, userName);
await emailService.sendPasswordResetEmail(to, resetToken);
await emailService.sendApplicationReceived(to, studentName, applicationId);
await emailService.sendInterviewInvitation(to, studentName, interviewData, interviewId);
```

### 2. `institutionalEmailService.ts` - Emails Institucionales

```typescript
import { institutionalEmailService } from './services';

// Todos los métodos ahora incluyen el campo 'template' en el payload
await institutionalEmailService.sendApplicationReceivedEmail(applicationId, {
  studentName: 'Juan Pérez',
  applicationId: 123
});

await institutionalEmailService.sendStatusUpdateEmail(applicationId, {
  newStatus: 'APPROVED',
  studentName: 'Juan Pérez'
});

await institutionalEmailService.sendInterviewInvitationEmail(interviewId, {
  studentName: 'Juan Pérez',
  interviewDate: '2024-01-15',
  interviewTime: '10:00',
  interviewLocation: 'Sala de Entrevistas'
});
```

### 3. `emailTemplateService.ts` - Templates Legacy

```typescript
import { emailTemplateService } from './services';

// Mapea templateKey a EmailTemplate enum y usa emailService
await emailTemplateService.sendTemplatedEmail(
  'INTERVIEW_ASSIGNMENT',  // Se mapea a INTERVIEW_INVITATION
  'apoderado@ejemplo.cl',
  { studentName: 'Juan Pérez', interviewDate: '2024-01-15' }
);
```

## Endpoints del BFF

### Envío Directo
```
POST /api/notifications/email
POST /api/notifications/email/bulk
POST /api/email/send-test
POST /api/email/send-verification
POST /api/email/verify-code
GET  /api/email/check-exists?email={email}
GET  /api/email/config-status
```

### Emails Institucionales
```
POST /api/institutional-emails/application-received/{applicationId}
POST /api/institutional-emails/status-update/{applicationId}
POST /api/institutional-emails/interview-invitation/{interviewId}
POST /api/institutional-emails/document-review/{applicationId}
POST /api/institutional-emails/document-reminder/{applicationId}
POST /api/institutional-emails/admission-result/{applicationId}
POST /api/institutional-emails/interview-summary/{applicationId}
POST /api/institutional-emails/evaluation-assignment/{evaluationId}
```

### Consulta
```
GET    /api/notifications           - Listar notificaciones
GET    /api/notifications/{id}      - Detalle
DELETE /api/notifications/{id}      - Eliminar
```

## Ejemplos de Uso

### 1. Postulación Recibida (automático)
```typescript
import { institutionalEmailService } from '../services';

// En ApplicationService.create() o similar
await institutionalEmailService.sendApplicationReceivedEmail(
  createdApplication.id,
  {
    studentName: createdApplication.student.firstName + ' ' + createdApplication.student.lastName,
    applicationId: createdApplication.id
  }
);
```

### 2. Actualización de Estado
```typescript
import { institutionalEmailService } from '../services';

// En ApplicationService.updateStatus() o similar
await institutionalEmailService.sendStatusUpdateEmail(
  applicationId,
  {
    newStatus: newStatus,
    studentName: application.student.firstName + ' ' + application.student.lastName
  }
);
```

### 3. Invitación a Entrevista
```typescript
import { institutionalEmailService } from '../services';

// En InterviewService.create() o similar
await institutionalEmailService.sendInterviewInvitationEmail(
  interview.id,
  {
    studentName: interview.studentName,
    interviewDate: interview.scheduledDate,
    interviewTime: interview.scheduledTime,
    interviewLocation: interview.location,
    parentNames: interview.parentNames
  }
);
```

### 4. Email de Prueba
```typescript
import { emailService } from '../services';

await emailService.sendTestEmail('test@ejemplo.cl');
```

## Mapeo Legacy a Nuevo Contrato

| Campo Antiguo | Campo Nuevo | Notas |
|--------------|-------------|-------|
| `type` | `template` | `type: 'application-received'` → `template: 'APPLICATION_RECEIVED'` |
| `templateName` | `template` | Case-insensitive, enum valida |
| `templateKey` | `template` | Mapeo en emailTemplateService |
| `variables` | `data` | Objeto con variables |
| `recipientEmail` | `to` | Destinatario |
| `subject` | `subject` | Override opcional |

## Compatibilidad Hacia Atrás

El BFF acepta:
1. `template` (campo principal, recomendado)
2. `templateName` (fallback)
3. `type` (fallback legacy)
4. Si ninguno → `GENERIC`

## Variables por Template

### APPLICATION_RECEIVED
```typescript
data: {
  studentName: string;
  applicationId: number;
}
```

### STATUS_UPDATE
```typescript
data: {
  newStatus: string;
  studentName?: string;
}
```

### INTERVIEW_INVITATION
```typescript
data: {
  studentName: string;
  interviewDate: string;
  interviewTime: string;
  interviewLocation?: string;
  meetingLink?: string;
  parentNames?: string;
}
```

### DOCUMENT_REVIEW
```typescript
data: {
  approvedDocuments: string[];
  rejectedDocuments: string[];
  allApproved: boolean;
  studentName?: string;
}
```

### DOCUMENT_REMINDER
```typescript
data: {
  pendingDocuments: string;
  studentName?: string;
}
```

### ADMISSION_RESULT
```typescript
data: {
  result: string;
  message?: string;
  studentName?: string;
}
```

## Errores Comunes

### 400 Bad Request - Template no válido
```json
{
  "error": "Invalid template: 'UNKNOWN_TEMPLATE'",
  "validTemplates": ["APPLICATION_RECEIVED", "STATUS_UPDATE", ...]
}
```

### 400 Bad Request - Missing required field
```json
{
  "error": "Field 'template' is required"
}
```

### 404 Not Found - Institutional email service
El servicio de emails institucionales no está disponible (verificar que el BFF esté activo).

## Configuración en BFF

```yaml
# application.yml
app:
  email:
    provider: resend  # resend | ses | javamail
    mock-mode: false  # true = no envía realmente
    from: no-reply@ku-soluciones.cl
    resend:
      api-key: ${RESEND_API_KEY}
```

## Archivos Modificados

1. `types/email.ts` - Nuevo archivo con tipos y enum
2. `services/emailService.ts` - Nuevo servicio de email directo
3. `services/institutionalEmailService.ts` - Actualizado con campo `template`
4. `services/emailTemplateService.ts` - Actualizado para usar emailService

## Próximos Pasos Recomendados

1. **Disparar automáticamente** desde services:
   - `ApplicationService.create()` → `APPLICATION_RECEIVED`
   - `ApplicationService.updateStatus()` → `STATUS_UPDATE`
   - `InterviewService.create()` → `INTERVIEW_INVITATION`
   - `InterviewService.reschedule/cancel()` → `INTERVIEW_RESCHEDULED/INTERVIEW_CANCELLED`

2. **Auth endpoints**:
   - `forgot-password` → `PASSWORD_RESET`
   - `reset-password` → `PASSWORD_CHANGED`
   - `register` → `WELCOME`

3. **Tests**: Verificar que todos los templates funcionan correctamente.
