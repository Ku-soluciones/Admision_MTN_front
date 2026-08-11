import React from 'react';
import {
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiExternalLink,
  FiFileText,
  FiMinusCircle,
  FiUsers
} from 'react-icons/fi';
import type {
  ApplicantCardFamilyQuestionnaire,
  ApplicantCardQuestionnaireAnswers
} from '../../../../packages/shared-ui/src/src/api/dashboard.types';
import { safeDisplayText } from './admissionReportUtils';

interface FamilyQuestionnaireSectionProps {
  questionnaire?: ApplicantCardFamilyQuestionnaire;
}

type QuestionnaireStatus = ApplicantCardFamilyQuestionnaire['status'];

const STATUS_CONTENT: Record<QuestionnaireStatus, { title: string; description: string; tone: string }> = {
  SUBMITTED: {
    title: 'Cuestionario enviado',
    description: 'Las respuestas finales de la familia están disponibles.',
    tone: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20'
  },
  DRAFT: {
    title: 'Borrador pendiente de envío',
    description: 'La familia inició el cuestionario, pero sus respuestas permanecen privadas hasta el envío final.',
    tone: 'bg-amber-50 text-amber-900 ring-amber-600/20'
  },
  NOT_STARTED: {
    title: 'Cuestionario no enviado',
    description: 'Todavía no existe un cuestionario final disponible para esta postulación.',
    tone: 'bg-slate-100 text-slate-700 ring-slate-500/20'
  }
};

export const FamilyQuestionnaireSection: React.FC<FamilyQuestionnaireSectionProps> = ({ questionnaire }) => {
  const status: QuestionnaireStatus = questionnaire?.status
    ?? (questionnaire?.received ? 'SUBMITTED' : 'NOT_STARTED');
  const statusContent = STATUS_CONTENT[status];
  const answers = status === 'SUBMITTED' ? questionnaire?.answers : undefined;

  return (
    <section aria-labelledby="family-questionnaire-title">
      <h3 id="family-questionnaire-title" className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-2 text-base font-bold text-slate-950">
        <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
        Cuestionario complementario
      </h3>

      <div className={`flex items-start gap-3 rounded-xl px-3 py-3 ring-1 ring-inset sm:px-4 ${statusContent.tone}`} role="status">
        <span className="mt-0.5 shrink-0" aria-hidden="true">
          <QuestionnaireStatusIcon status={status} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{statusContent.title}</p>
          <p className="mt-0.5 max-w-[70ch] text-sm leading-5">{statusContent.description}</p>
          {status === 'SUBMITTED' && questionnaire?.submittedAt && (
            <p className="mt-1 text-xs font-semibold">Enviado el {formatQuestionnaireDate(questionnaire.submittedAt)}</p>
          )}
        </div>
      </div>

      {status === 'SUBMITTED' && answers && (
        <div className="mt-3 space-y-2">
          <QuestionnaireDisclosure
            title="Antecedentes familiares"
            description="Postulaciones adicionales, educación y actividad de los padres"
          >
            <FamilyBackground answers={answers} />
          </QuestionnaireDisclosure>

          <QuestionnaireDisclosure
            title="Motivaciones, valores y experiencias"
            description="Respuestas abiertas entregadas por la familia"
          >
            <dl className="space-y-5">
              <AnswerField label="1. Motivos de postulación al Monte Tabor y Nazaret" value={answers.applicationReasons} />
              <AnswerField label="2. Motivo de cambio de colegio" value={answers.schoolChangeReason} />
              <AnswerField label="3. ¿Qué es importante para su familia?" value={answers.familyValues} />
              <AnswerField label="4. Experiencias de fe como familia" value={answers.faithExperiences} />
              <AnswerField label="5. Experiencias de ayuda, aporte o servicio a la sociedad" value={answers.communityServiceExperiences} />
            </dl>
          </QuestionnaireDisclosure>

          <QuestionnaireDisclosure
            title="Descripción de los hijos"
            description={`${answers.childrenDescriptions.length} ${answers.childrenDescriptions.length === 1 ? 'hijo/a registrado/a' : 'hijos/as registrados/as'}`}
          >
            <ChildrenAnswers answers={answers} />
          </QuestionnaireDisclosure>
        </div>
      )}

      {status === 'SUBMITTED' && !answers && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-600 ring-1 ring-inset ring-slate-200">
          El cuestionario figura como enviado, pero sus respuestas no están disponibles en este registro.
        </p>
      )}

      {questionnaire?.reportLink && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <a
            href={questionnaire.reportLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-blue-800 underline-offset-4 hover:bg-blue-50 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            <FiFileText className="h-4 w-4" aria-hidden="true" />
            Abrir informe adjunto
            <FiExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      )}
    </section>
  );
};

const QuestionnaireStatusIcon: React.FC<{ status: QuestionnaireStatus }> = ({ status }) => {
  if (status === 'SUBMITTED') return <FiCheckCircle className="h-5 w-5" />;
  if (status === 'DRAFT') return <FiClock className="h-5 w-5" />;
  return <FiMinusCircle className="h-5 w-5" />;
};

const QuestionnaireDisclosure: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <details className="group overflow-hidden rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200">
    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-700 sm:px-4 [&::-webkit-details-marker]:hidden">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-800 ring-1 ring-inset ring-slate-200" aria-hidden="true">
        <FiUsers className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-bold text-slate-950">{title}</strong>
        <span className="mt-0.5 block text-xs leading-4 text-slate-600">{description}</span>
      </span>
      <FiChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
    </summary>
    <div className="border-t border-slate-200 bg-white px-3 py-4 sm:px-4">
      {children}
    </div>
  </details>
);

const FamilyBackground: React.FC<{ answers: ApplicantCardQuestionnaireAnswers }> = ({ answers }) => (
  <div className="space-y-6">
    <dl>
      <AnswerField label="Otros colegios a los que postula" value={answers.otherSchools} />
    </dl>
    <div className="grid gap-6 sm:grid-cols-2">
      <section aria-labelledby="questionnaire-father-title">
        <h4 id="questionnaire-father-title" className="text-sm font-bold text-slate-950">Padre</h4>
        <dl className="mt-3 space-y-4">
          <AnswerField label="Nombre" value={answers.fatherName} compact />
          <AnswerField label="Educación escolar y superior" value={answers.fatherEducation} compact />
          <AnswerField label="Actividad actual" value={answers.fatherCurrentActivity} compact />
        </dl>
      </section>
      <section aria-labelledby="questionnaire-mother-title">
        <h4 id="questionnaire-mother-title" className="text-sm font-bold text-slate-950">Madre</h4>
        <dl className="mt-3 space-y-4">
          <AnswerField label="Nombre" value={answers.motherName} compact />
          <AnswerField label="Educación escolar y superior" value={answers.motherEducation} compact />
          <AnswerField label="Actividad actual" value={answers.motherCurrentActivity} compact />
        </dl>
      </section>
    </div>
  </div>
);

const ChildrenAnswers: React.FC<{ answers: ApplicantCardQuestionnaireAnswers }> = ({ answers }) => {
  if (!answers.childrenDescriptions.length) {
    return <p className="text-sm text-slate-600">No se registraron descripciones de hijos.</p>;
  }

  return (
    <div className="divide-y divide-slate-200">
      {answers.childrenDescriptions.map((child, index) => (
        <section key={`${child.childName || 'hijo'}-${index}`} className="py-5 first:pt-0 last:pb-0" aria-label={`Descripción de hijo/a ${index + 1}`}>
          <h4 className="break-words text-sm font-bold text-blue-900">
            {safeDisplayText(child.childName, `Hijo/a ${index + 1}`)}
          </h4>
          <dl className="mt-3 space-y-4">
            <AnswerField label="6. ¿Cómo describe a este hijo/a?" value={child.description} />
            <AnswerField label="7. ¿Qué sueña para este hijo/a en particular?" value={child.dream} />
          </dl>
        </section>
      ))}
    </div>
  );
};

const AnswerField: React.FC<{ label: string; value?: string | null; compact?: boolean }> = ({ label, value, compact }) => (
  <div>
    <dt className="text-xs font-semibold leading-5 text-slate-500">{label}</dt>
    <dd className={`${compact ? 'mt-0.5' : 'mt-1'} max-w-[72ch] whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-900`}>
      {safeDisplayText(value, 'No respondido')}
    </dd>
  </div>
);

const formatQuestionnaireDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'fecha no disponible';
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};
