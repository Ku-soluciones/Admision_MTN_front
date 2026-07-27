import React from 'react';
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiClock,
  FiEdit,
  FiMail,
  FiMapPin,
  FiRefreshCw,
  FiUnlock,
  FiUser,
  FiUsers,
  FiX
} from 'react-icons/fi';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import {
  Interview,
  InterviewLifecycle,
  InterviewMode,
  InterviewStatus,
  INTERVIEW_MODE_LABELS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  InterviewUtils
} from '../../types/interview';

interface InterviewDetailsPanelProps {
  interview: Interview;
  onClose: () => void;
  onEdit?: (interview: Interview) => void;
  onCancel?: (interview: Interview) => void;
  onReschedule?: (interview: Interview) => void;
  onRelease?: (interview: Interview) => void;
  onComplete?: (interview: Interview) => void;
  onSendInvitation?: (interview: Interview) => void;
  className?: string;
}

const parseLocalDate = (date: string): Date | null => {
  if (!date) return null;
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatDate = (date: string): string => {
  const parsed = parseLocalDate(date);
  if (!parsed) return 'Sin fecha registrada';
  return parsed.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatTime = (time: string): string => {
  if (!time) return 'Sin hora registrada';
  return time.substring(0, 5);
};

const valueOrEmpty = (value?: string | number | null): string => {
  if (value === undefined || value === null || value === '') return 'Sin registrar';
  return String(value);
};

const getStatusMessage = (status: InterviewStatus): { title: string; body: string; tone: string } => {
  switch (status) {
    case InterviewStatus.PENDING:
      return {
        title: 'Entrevista pendiente de agendar',
        body: 'Aun no existe un horario confirmado para esta entrevista.',
        tone: 'border-amber-200 bg-amber-50 text-amber-900'
      };
    case InterviewStatus.SCHEDULED:
      return {
        title: 'Esperando confirmacion familiar',
        body: 'La invitacion fue enviada o esta lista para enviarse al apoderado.',
        tone: 'border-blue-200 bg-blue-50 text-blue-900'
      };
    case InterviewStatus.CONFIRMED:
      return {
        title: 'Asistencia confirmada',
        body: 'La familia confirmo este horario. Mantenga cambios y cancelaciones como acciones explicitas.',
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-900'
      };
    case InterviewStatus.IN_PROGRESS:
      return {
        title: 'Entrevista en curso',
        body: 'La entrevista esta abierta para completar resultados o cerrar el proceso.',
        tone: 'border-amber-200 bg-amber-50 text-amber-900'
      };
    case InterviewStatus.COMPLETED:
      return {
        title: 'Entrevista realizada',
        body: 'La entrevista ya fue cerrada. Revise resultados, recomendaciones y seguimiento.',
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-900'
      };
    case InterviewStatus.CANCELLED:
      return {
        title: 'Entrevista cancelada',
        body: 'El horario original quedo liberado. Puede reagendarla si el proceso sigue activo.',
        tone: 'border-red-200 bg-red-50 text-red-900'
      };
    case InterviewStatus.REJECTED_BY_FAMILY:
      return {
        title: 'La familia solicito otro horario',
        body: 'El apoderado indico que no puede asistir. Reagende solo cuando tenga una nueva propuesta.',
        tone: 'border-gray-300 bg-gray-50 text-gray-900'
      };
    case InterviewStatus.NO_SHOW:
      return {
        title: 'Familia no asistio',
        body: 'Registre seguimiento o reagende si admision decide ofrecer una nueva instancia.',
        tone: 'border-red-200 bg-red-50 text-red-900'
      };
    case InterviewStatus.RESCHEDULED:
      return {
        title: 'Entrevista marcada para reagendar',
        body: 'Revise el horario actual y confirme una nueva fecha cuando corresponda.',
        tone: 'border-orange-200 bg-orange-50 text-orange-900'
      };
    default:
      return {
        title: 'Estado de entrevista',
        body: 'Revise la informacion antes de ejecutar acciones sobre esta entrevista.',
        tone: 'border-gray-200 bg-gray-50 text-gray-800'
      };
  }
};

const DetailItem: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="min-w-0">
    <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
      {icon}
      {label}
    </dt>
    <dd className="mt-1 break-words text-sm font-medium text-gray-950">{value}</dd>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-3 border-t border-gray-200 pt-5">
    <h3 className="text-sm font-bold text-gray-950">{title}</h3>
    {children}
  </section>
);

const InterviewDetailsPanel: React.FC<InterviewDetailsPanelProps> = ({
  interview,
  onClose,
  onEdit,
  onCancel,
  onReschedule,
  onRelease,
  onComplete,
  onSendInvitation,
  className = ''
}) => {
  const statusMessage = getStatusMessage(interview.status);
  const canEdit = Boolean(onEdit && InterviewLifecycle.isEditable(interview.status));
  const canCancel = Boolean(onCancel && InterviewLifecycle.canCancel(interview.status));
  const canComplete = Boolean(onComplete && InterviewLifecycle.canComplete(interview.status));
  const canRelease = Boolean(onRelease && interview.status === InterviewStatus.REJECTED_BY_FAMILY);
  const canReschedule = Boolean(
    onReschedule &&
    (InterviewLifecycle.needsScheduling(interview.status) || InterviewLifecycle.isEditable(interview.status)) &&
    !(interview.status === InterviewStatus.REJECTED_BY_FAMILY && onRelease)
  );
  const canSendInvitation = Boolean(onSendInvitation && interview.status === InterviewStatus.SCHEDULED);
  const isVirtual = interview.mode === InterviewMode.VIRTUAL;
  const isHybrid = interview.mode === InterviewMode.HYBRID;

  return (
    <article className={`space-y-6 ${className}`}>
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-500">Detalle de entrevista</p>
          <h2 className="mt-1 break-words text-2xl font-bold text-gray-950">{interview.studentName}</h2>
          <p className="mt-2 text-sm text-gray-600">
            {INTERVIEW_TYPE_LABELS[interview.type]} · {valueOrEmpty(interview.gradeApplied)} · Postulacion #{interview.applicationId}
          </p>
        </div>
        <Badge variant={InterviewUtils.getStatusColor(interview.status)} size="md">
          {INTERVIEW_STATUS_LABELS[interview.status]}
        </Badge>
      </header>

      <div className={`rounded-lg border p-4 ${statusMessage.tone}`}>
        <div className="flex gap-3">
          <FiAlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-bold">{statusMessage.title}</h3>
            <p className="mt-1 text-sm">{statusMessage.body}</p>
          </div>
        </div>
      </div>

      <Section title="Agenda">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label={InterviewLifecycle.isInactive(interview.status) ? 'Fecha original' : 'Fecha'} value={formatDate(interview.scheduledDate)} icon={<FiCalendar aria-hidden="true" />} />
          <DetailItem label="Hora" value={formatTime(interview.scheduledTime)} icon={<FiClock aria-hidden="true" />} />
          <DetailItem label="Duracion" value={InterviewUtils.formatDuration(interview.duration || 60)} icon={<FiClock aria-hidden="true" />} />
          <DetailItem label="Tipo" value={INTERVIEW_TYPE_LABELS[interview.type]} />
          <DetailItem label="Modalidad" value={INTERVIEW_MODE_LABELS[interview.mode]} icon={<FiMapPin aria-hidden="true" />} />
          <DetailItem
            label={isVirtual ? 'Enlace' : isHybrid ? 'Ubicacion / enlace' : 'Ubicacion'}
            value={
              interview.virtualMeetingLink ? (
                <a className="text-azul-monte-tabor underline underline-offset-2" href={interview.virtualMeetingLink} target="_blank" rel="noopener noreferrer">
                  {interview.virtualMeetingLink}
                </a>
              ) : valueOrEmpty(interview.location)
            }
            icon={<FiMapPin aria-hidden="true" />}
          />
        </dl>
      </Section>

      <Section title="Participantes">
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailItem label="Apoderados" value={valueOrEmpty(interview.parentNames)} icon={<FiUsers aria-hidden="true" />} />
          <DetailItem
            label={interview.secondInterviewerName ? 'Entrevistadores' : 'Entrevistador'}
            value={
              <span>
                {valueOrEmpty(interview.interviewerName)}
                {interview.secondInterviewerName && <span className="block text-gray-700">{interview.secondInterviewerName}</span>}
              </span>
            }
            icon={<FiUser aria-hidden="true" />}
          />
        </dl>
      </Section>

      <Section title="Notas">
        <dl className="grid gap-4 md:grid-cols-2">
          <DetailItem label="Notas" value={valueOrEmpty(interview.notes || 'Sin notas registradas')} />
          <DetailItem label="Preparacion" value={valueOrEmpty(interview.preparation || 'Sin preparacion registrada')} />
        </dl>
      </Section>

      {(interview.result || interview.recommendations || interview.followUpRequired) && (
        <Section title="Resultado">
          <dl className="grid gap-4 md:grid-cols-2">
            <DetailItem label="Resultado" value={valueOrEmpty(interview.result)} icon={<FiCheck aria-hidden="true" />} />
            <DetailItem label="Puntaje" value={interview.score ? `${interview.score}/10` : 'Sin puntaje'} />
            <DetailItem label="Recomendaciones" value={valueOrEmpty(interview.recommendations || 'Sin recomendaciones registradas')} />
            <DetailItem label="Seguimiento" value={interview.followUpRequired ? valueOrEmpty(interview.followUpNotes || 'Requiere seguimiento') : 'No requiere seguimiento'} />
          </dl>
        </Section>
      )}

      <footer className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:flex-wrap sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Cerrar
        </Button>
        {canSendInvitation && (
          <Button type="button" variant="outline" onClick={() => onSendInvitation?.(interview)}>
            <FiMail className="mr-2 h-4 w-4" aria-hidden="true" />
            Reenviar invitacion
          </Button>
        )}
        {canCancel && (
          <Button type="button" variant="danger" onClick={() => onCancel?.(interview)}>
            <FiX className="mr-2 h-4 w-4" aria-hidden="true" />
            Cancelar entrevista
          </Button>
        )}
        {canEdit && (
          <Button type="button" variant="secondary" onClick={() => onEdit?.(interview)}>
            <FiEdit className="mr-2 h-4 w-4" aria-hidden="true" />
            Editar entrevista
          </Button>
        )}
        {canComplete && (
          <Button type="button" variant="success" onClick={() => onComplete?.(interview)}>
            <FiCheck className="mr-2 h-4 w-4" aria-hidden="true" />
            Completar entrevista
          </Button>
        )}
        {canRelease && (
          <Button type="button" variant="primary" onClick={() => onRelease?.(interview)}>
            <FiUnlock className="mr-2 h-4 w-4" aria-hidden="true" />
            Liberar para reagendar
          </Button>
        )}
        {canReschedule && (
          <Button type="button" variant="primary" onClick={() => onReschedule?.(interview)}>
            <FiRefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Reagendar entrevista
          </Button>
        )}
      </footer>
    </article>
  );
};

export default InterviewDetailsPanel;
