import { authStore } from "../../../packages/backend-sdk/src/auth/store";
import { runSharedRefresh } from "../../../packages/backend-sdk/src/auth/sharedRefreshQueue";
import { auth } from "../../admin/src/lib/firebase";

const LOCAL_GATEWAY = "http://localhost:8081";

function baseUrl(): string {
  const configured = (import.meta as any).env?.VITE_API_BASE_URL as
    string | undefined;
  if (configured) return configured.replace(/\/+$/, "");
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  )
    return LOCAL_GATEWAY;
  return window.location.origin;
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshed = await runSharedRefresh();
  return refreshed?.token ?? null;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
  tokenOverride?: string,
): Promise<T> {
  // El BFF ya intercambió/verificó Firebase durante el login. Para las rutas
  // Prekínder usamos primero su access token corto, de modo que toda la sesión
  // se renueve por /v1/auth/refresh a través de NGINX. El idToken Firebase queda
  // únicamente como respaldo para una sesión recién restaurada.
  let token = tokenOverride ?? authStore.getValidAccessToken(15_000);
  if (!token) token = await refreshAccessToken();
  if (!token && auth.currentUser) token = await auth.currentUser.getIdToken();
  if (!token) throw new ApiError(401, "Tu sesión expiró. Ingresa nuevamente.");
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    // Las lecturas administrativas se usan para confirmar escrituras recién
    // realizadas; no deben reutilizar una representación anterior del proceso.
    cache: init.cache ?? "no-store",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      Authorization: `Bearer ${token}`,
      "X-Request-ID": crypto.randomUUID(),
      ...init.headers,
    },
  });
  if (response.status === 401 && retry) {
    const renewed = await refreshAccessToken();
    if (renewed) return apiRequest<T>(path, init, false, renewed);
    if (auth.currentUser) {
      const firebaseToken = await auth.currentUser.getIdToken(true);
      return apiRequest<T>(path, init, false, firebaseToken);
    }
  }
  const body = await response.json().catch(() => null);
  console.debug("[DEBUG apiRequest] path:", path, "status:", response.status, "body:", JSON.stringify(body, null, 2)?.slice(0, 500));
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.message || recoveryMessage(response.status),
    );
  }
  return body.data as T;
}

function recoveryMessage(status: number): string {
  if (status === 409)
    return "El dato cambió. Resincroniza e intenta nuevamente.";
  if (status === 503)
    return "El tiempo real no está disponible. Puedes continuar en modo seguro.";
  return "No pudimos completar la operación. Intenta nuevamente.";
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export type Evaluation = {
  evaluationId: string;
  applicationId: string;
  typeCode: string;
  status: string;
  serverSequence: number;
  version: number;
};

export type AdmissionProcess = {
  processId: string;
  academicYear: number;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  startsAt: string | null;
  endsAt: string | null;
  version: number;
  applicationCount: number;
  acceptingApplications: boolean;
};

export type PrekinderApplicationOption = {
  processId: string;
  academicYear: number;
  name: string;
  waveId: string;
  waveType: "SIBLINGS" | "STAFF_OR_ALUMNI" | "NEW_FAMILIES";
  opensAt: string;
  closesAt: string;
};

export type PrekinderApplication = {
  applicationId: string;
  applicantId: string;
  processId: string;
  status: string;
  identity: {
    rut: string;
    firstName: string;
    paternalLastName: string;
    maternalLastName: string;
  };
  createdAt: string;
};

export type Wave = {
  waveId: string;
  processId: string;
  waveType: "SIBLINGS" | "STAFF_OR_ALUMNI" | "NEW_FAMILIES";
  position: number;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "CANCELLED";
  opensAt: string | null;
  closesAt: string | null;
  version: number;
  active: boolean;
};

export type ApplicantIdentity = {
  rut: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  birthDate: string;
  familyEmail: string;
  fatherEmail: string;
  motherEmail: string;
};

export type FamilyAdultDetails = {
  fullName: string;
  rut: string;
  email: string;
  phone: string;
  address: string;
  profession?: string;
};

export type ResponsibleAdultDetails = {
  fullName: string;
  rut: string;
  email: string;
  phone: string;
  relationship: string;
};

export type PrekinderApplicationDetails = {
  gender: "MALE" | "FEMALE";
  studentEmail?: string;
  address: {
    street: string;
    number: string;
    apartment?: string;
    country: string;
    region?: string;
    commune: string;
  };
  grade: "PRE_KINDER";
  applicationYear: number;
  currentSchool?: string;
  additionalNotes?: string;
  admissionPreference: "NINGUNA" | "HIJO_FUNCIONARIO" | "HIJO_EX_ALUMNO";
  hasSiblingsInSchool: boolean;
  siblingsInSchoolDetails?: string;
  father: FamilyAdultDetails;
  mother: FamilyAdultDetails;
  supporter: ResponsibleAdultDetails;
  guardian: ResponsibleAdultDetails;
};

export type FlowApplication = {
  applicationId: string;
  applicantId: string;
  processId: string;
  waveId: string;
  status: string;
  eligibilityCategory: Wave["waveType"];
  eligibilityStatus: string;
  version: number;
  declarationVersion: number;
  identity: ApplicantIdentity;
  applicationDetails: PrekinderApplicationDetails | null;
  createdAt: string;
};

export type Professional = {
  professionalId: string;
  legacyUserId: number | null;
  displayName: string;
  email: string;
  specialty: string;
  roleCode: ProfessionalRoleCode | "ADMIN" | "COORDINATOR" | "EVALUATOR";
  roleLabel: string;
  roleGroup: ProfessionalRoleGroup | "PENDING";
  instrumentCode: string | null;
  active: boolean;
  version: number;
};

export type ProfessionalRoleCode =
  | "PK_ADMIN"
  | "PK_COORDINATOR"
  | "PK_RECEPTION"
  | "PK_DATA_ENTRY"
  | "PK_REVIEWER"
  | "PK_COMMITTEE"
  | "PK_FINAL_APPROVER"
  | "PK_AUDITOR"
  | "PK_EVALUATOR_ACADEMIC"
  | "PK_EVALUATOR_PSYCHOMOTOR"
  | "PK_EVALUATOR_PSYCHOLOGY"
  | "PK_EVALUATOR_ENTRY_INDICATORS"
  | "PK_EVALUATOR_GROUP_OBSERVATION"
  | "PK_EVALUATOR_LEARNING_SUPPORT"
  | "PK_EVALUATOR_DAP";

export type ProfessionalRoleGroup =
  | "ADMINISTRACION"
  | "OPERACION"
  | "EVALUACION"
  | "DECISION_CONTROL";

export type ProfessionalRoleDefinition = {
  roleCode: ProfessionalRoleCode;
  label: string;
  groupCode: ProfessionalRoleGroup;
  instrumentCode: string | null;
  position: number;
};

export type Room = {
  roomId: string;
  processId: string;
  code: string;
  name: string;
  capacity: number;
  active: boolean;
  version: number;
};

export type EvaluationGroup = {
  groupId: string;
  processId: string;
  roomId: string;
  roomName: string;
  stage: "GROUP_3" | "GROUP_9";
  code: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  requiredEvaluators: number;
  status: string;
  version: number;
  memberIds: string[];
  evaluatorIds: string[];
};

export type ReportSummary = {
  reportId: string;
  applicationId: string;
  applicantName: string;
  status: string;
  version: number;
  rawScore: number | null;
  maximumScore: number | null;
};

export type AgendaGroup = {
  group: EvaluationGroup;
  editableNow: boolean;
  reports: ReportSummary[];
};

export type EvaluatorAssignment = {
  assignmentId: string;
  instrumentCode: string;
  status: string;
  version: number;
  group: EvaluationGroup;
  reports: ReportSummary[];
};

export type EvaluatorAgenda = {
  profile: {
    actorId: string;
    instrumentCode: string;
    instrumentName: string;
  };
  assignments: EvaluatorAssignment[];
};

export type EvaluationInstrument = {
  instrumentCode: string;
  displayName: string;
  captureMode: "GROUP_PARALLEL" | "INDIVIDUAL" | "DERIVED_INDIVIDUAL";
  sensitive: boolean;
  active: boolean;
  position: number;
};

export type EvaluatorWorkspace = {
  actorId: string;
  date: string;
  serverSequence: number;
  instruments: Array<{
    instrument: EvaluationInstrument;
    assignments: EvaluatorAssignment[];
  }>;
};

export type ControlTowerDay = {
  processId: string;
  date: string;
  timezone: string;
  serverSequence: number;
  summary: {
    applicants: number;
    present: number;
    groupsInProgress: number;
    groupsValidated: number;
    openIncidents: number;
  };
  rooms: Array<{
    roomId: string;
    name: string;
    groups: Array<{
      groupId: string;
      code: string;
      startsAt: string;
      endsAt: string;
      status: string;
      capacity: number;
      memberCount: number;
      attendance: { present: number; pending: number; absent: number };
      instrumentProgress: Record<string, string>;
      version: number;
    }>;
  }>;
};

export type Report = {
  header: {
    reportId: string;
    groupId: string;
    applicationId: string;
    applicantName: string;
    evaluatorId: string;
    templateVersionId: string;
    status: string;
    rawScore: number | null;
    maximumScore: number | null;
    version: number;
    stage: "GROUP_3" | "GROUP_9";
    groupCode: string;
    startsAt: string;
    endsAt: string;
    roomName: string;
  };
  editableNow: boolean;
  criteria: Array<{
    criterionId: string;
    code: string;
    name: string;
    descriptor: string;
    position: number;
    options: Array<{
      optionId: string;
      value: number;
      label: string;
      descriptor: string;
      position: number;
    }>;
    responseId: string | null;
    selectedOptionId: string | null;
    notObserved: boolean;
    observedValue: number | null;
    responseVersion: number;
  }>;
  note: { noteId: string | null; content: string; version: number };
};

export type DashboardMetrics = {
  applications: number;
  eligibilityPending: number;
  groupsToday: number;
  reportsPending: number;
  decisionsReady: number;
};

export type PublishedResult = {
  applicationId: string;
  applicantName: string;
  decision: "ACCEPTED" | "REJECTED" | "WAITLIST";
  publishedAt: string;
  decisionVersion: number;
};

export type Comment = {
  commentId: string;
  evaluationId: string;
  authorId: string;
  operationId: string;
  serverSequence: number;
  status: string;
  revision: number;
  revisionState: "CURRENT" | "CONFLICTED" | "TOMBSTONE";
  content: string;
  createdAt: string;
};

export const prekinderApi = {
  processes: () => apiRequest<AdmissionProcess[]>("/v1/prekinder/processes"),
  applicationOptions: () =>
    apiRequest<PrekinderApplicationOption[]>(
      "/v1/prekinder/application-options",
    ),
  createProcess: (academicYear: number, name: string) =>
    apiRequest<AdmissionProcess>("/v1/prekinder/processes", {
      method: "POST",
      body: JSON.stringify({ academicYear, name }),
    }),
  publishProcess: (processId: string, startsAt: string, endsAt: string) =>
    apiRequest<AdmissionProcess>(
      `/v1/prekinder/processes/${processId}/publication`,
      {
        method: "PUT",
        body: JSON.stringify({ startsAt, endsAt }),
      },
    ),
  applications: (processId: string) =>
    apiRequest<PrekinderApplication[]>(
      `/v1/prekinder/applications?processId=${encodeURIComponent(processId)}`,
    ),
  createApplication: (input: {
    processId: string;
    rut: string;
    firstName: string;
    paternalLastName: string;
    maternalLastName: string;
  }) =>
    apiRequest<PrekinderApplication>("/v1/prekinder/applications", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  evaluations: () => apiRequest<Evaluation[]>("/v1/prekinder/evaluations"),
  comments: (evaluationId: string) =>
    apiRequest<Comment[]>(`/v1/prekinder/evaluations/${evaluationId}/comments`),
  ticket: () =>
    apiRequest<{ ticket: string; expiresInSeconds: number }>(
      "/v1/prekinder/realtime/tickets",
      { method: "POST" },
    ),
  createComment: (evaluationId: string, operationId: string, content: string) =>
    apiRequest<{ comment: Comment; duplicate: boolean }>(
      `/v1/prekinder/evaluations/${evaluationId}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ operationId, content }),
      },
    ),
  events: (evaluationId: string, afterSequence: number) =>
    apiRequest<
      Array<{
        eventId: string;
        entityId: string;
        sequence: number;
        eventType: string;
      }>
    >(
      `/v1/prekinder/evaluations/${evaluationId}/events?afterSequence=${afterSequence}`,
    ),
  waves: (processId: string) =>
    apiRequest<Wave[]>(`/v1/prekinder/processes/${processId}/waves`),
  configureWave: (
    waveId: string,
    input: {
      opensAt: string;
      closesAt: string;
      status: Wave["status"];
      expectedVersion: number;
    },
  ) =>
    apiRequest<Wave>(`/v1/prekinder/waves/${waveId}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  flowApplications: (processId: string) =>
    apiRequest<FlowApplication[]>(
      `/v1/prekinder/applications?processId=${encodeURIComponent(processId)}`,
    ),
  submitApplication: (input: {
    processId: string;
    rut: string;
    firstName: string;
    paternalLastName: string;
    maternalLastName: string;
    birthDate: string;
    familyEmail: string;
    fatherEmail: string;
    motherEmail: string;
    applicationDetails: PrekinderApplicationDetails;
    eligibility: {
      siblings: Array<{ name: string; rut: string; currentGrade: string }>;
      employeeParent: string;
      fatherAlumni: {
        status: string;
        graduationYear?: number;
        lastGrade?: string;
        withdrawalReason?: string;
      };
      motherAlumni: {
        status: string;
        graduationYear?: number;
        lastGrade?: string;
        withdrawalReason?: string;
      };
    };
  }) =>
    apiRequest<FlowApplication>("/v1/prekinder/applications", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  reviewEligibility: (
    applicationId: string,
    decision: "VERIFIED" | "REJECTED",
    reason: string,
    expectedVersion: number,
  ) =>
    apiRequest<FlowApplication>(
      `/v1/prekinder/applications/${applicationId}/eligibility`,
      {
        method: "PUT",
        body: JSON.stringify({ decision, reason, expectedVersion }),
      },
    ),
  professionals: (processId?: string) =>
    apiRequest<Professional[]>(
      processId
        ? `/v1/prekinder/professionals?processId=${encodeURIComponent(processId)}`
        : "/v1/prekinder/professionals",
    ),
  professionalRoles: () =>
    apiRequest<ProfessionalRoleDefinition[]>("/v1/prekinder/professional-roles"),
  saveProfessional: (
    input: Partial<Professional> & {
      processId: string;
      displayName: string;
      email: string;
      password?: string;
      roleCode: ProfessionalRoleCode;
      expectedVersion: number;
      password?: string;
    },
  ) =>
    apiRequest<Professional>("/v1/prekinder/professionals", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateProfessionalPassword: (professionalId: string, password: string) =>
    apiRequest<{ professionalId: string; passwordUpdated: boolean }>(
      `/v1/prekinder/professionals/${professionalId}/password`,
      {
        method: "PUT",
        body: JSON.stringify({ password }),
      },
    ),
  deleteProfessional: (professionalId: string, expectedVersion: number) =>
    apiRequest<{
      professionalId: string;
      deleted: boolean;
      firebaseAccountDeleted: boolean;
    }>(
      `/v1/prekinder/professionals/${professionalId}?expectedVersion=${expectedVersion}`,
      { method: "DELETE" },
    ),
  rooms: (processId: string) =>
    apiRequest<Room[]>(`/v1/prekinder/processes/${processId}/rooms`),
  createRoom: (
    processId: string,
    input: { code: string; name: string; capacity: number },
  ) =>
    apiRequest<Room>(`/v1/prekinder/processes/${processId}/rooms`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateRoom: (
    roomId: string,
    input: { code: string; name: string; capacity: number; expectedVersion: number },
  ) =>
    apiRequest<Room>(`/v1/prekinder/rooms/${roomId}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  deleteRoom: (roomId: string, expectedVersion: number) =>
    apiRequest<Room>(
      `/v1/prekinder/rooms/${roomId}?expectedVersion=${expectedVersion}`,
      { method: "DELETE" },
    ),
  groups: (processId: string, date: string) =>
    apiRequest<EvaluationGroup[]>(
      `/v1/prekinder/processes/${processId}/groups?date=${date}`,
    ),
  createGroup: (input: {
    processId: string;
    roomId: string;
    stage: EvaluationGroup["stage"];
    code: string;
    startsAt: string;
    durationMinutes: number;
    capacity: number;
    requiredEvaluators: number;
  }) =>
    apiRequest<EvaluationGroup>("/v1/prekinder/groups", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createAssignedGroup: (input: {
    processId: string;
    roomId: string;
    stage: EvaluationGroup["stage"];
    code: string;
    startsAt: string;
    durationMinutes: number;
    capacity: number;
    requiredEvaluators: number;
    memberIds: string[];
    evaluatorIds: string[];
  }) =>
    apiRequest<EvaluationGroup>("/v1/prekinder/groups", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateGroup: (
    groupId: string,
    input: {
      roomId: string;
      startsAt: string;
      durationMinutes: number;
      capacity: number;
      requiredEvaluators: number;
      memberIds: string[];
      evaluatorIds: string[];
      reason: string;
      expectedVersion: number;
    },
  ) =>
    apiRequest<EvaluationGroup>(`/v1/prekinder/groups/${groupId}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  rescheduleGroup: (
    groupId: string,
    input: {
      roomId: string;
      startsAt: string;
      durationMinutes: number;
      reason: string;
      expectedVersion: number;
    },
  ) =>
    apiRequest<EvaluationGroup>(`/v1/prekinder/groups/${groupId}/schedule`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  configureGroup: (
    groupId: string,
    input: {
      capacity: number;
      requiredEvaluators: number;
      reason: string;
      expectedVersion: number;
    },
  ) =>
    apiRequest<EvaluationGroup>(
      `/v1/prekinder/groups/${groupId}/configuration`,
      { method: "PUT", body: JSON.stringify(input) },
    ),
  deleteGroup: (groupId: string, expectedVersion: number) =>
    apiRequest<EvaluationGroup>(
      `/v1/prekinder/groups/${groupId}?expectedVersion=${expectedVersion}`,
      { method: "DELETE" },
    ),
  addMember: (groupId: string, applicationId: string) =>
    apiRequest<EvaluationGroup>(
      `/v1/prekinder/groups/${groupId}/members/${applicationId}`,
      { method: "POST" },
    ),
  removeMember: (groupId: string, applicationId: string, expectedVersion: number) =>
    apiRequest<EvaluationGroup>(
      `/v1/prekinder/groups/${groupId}/members/${applicationId}?expectedVersion=${expectedVersion}`,
      { method: "DELETE" },
    ),
  assignEvaluator: (groupId: string, evaluatorId: string) =>
    apiRequest<EvaluationGroup>(
      `/v1/prekinder/groups/${groupId}/evaluators/${evaluatorId}`,
      { method: "POST" },
    ),
  removeEvaluator: (groupId: string, evaluatorId: string, expectedVersion: number) =>
    apiRequest<EvaluationGroup>(
      `/v1/prekinder/groups/${groupId}/evaluators/${evaluatorId}?expectedVersion=${expectedVersion}`,
      { method: "DELETE" },
    ),
  confirmGroup: (groupId: string, expectedVersion: number) =>
    apiRequest<EvaluationGroup>(
      `/v1/prekinder/groups/${groupId}/confirmation`,
      {
        method: "PUT",
        body: JSON.stringify({ expectedVersion }),
      },
    ),
  agenda: (date: string) =>
    apiRequest<AgendaGroup[]>(`/v1/prekinder/me/agenda?date=${date}`),
  evaluatorAgenda: (date: string, instrument: string, processId?: string) => {
    const params = new URLSearchParams({ date, instrument });
    if (processId) params.set("processId", processId);
    const url = `/v1/prekinder/me/evaluator-agenda?${params.toString()}`;
    console.debug("[DEBUG api.evaluatorAgenda] fetching:", url);
    return apiRequest<EvaluatorAgenda>(url);
  },
  evaluatorWorkspace: (date: string, processId?: string) => {
    const params = new URLSearchParams({ date });
    if (processId) params.set("processId", processId);
    return apiRequest<EvaluatorWorkspace>(
      `/v1/prekinder/me/evaluator-workspace?${params.toString()}`,
    );
  },
  confirmEvaluatorAssignment: (assignmentId: string, expectedVersion: number) =>
    apiRequest<EvaluatorAssignment>(
      `/v1/prekinder/evaluator-assignments/${assignmentId}/confirm`,
      {
        method: "POST",
        body: JSON.stringify({ expectedVersion, operationId: crypto.randomUUID() }),
      },
    ),
  startEvaluatorAssignment: (assignmentId: string, expectedVersion: number) =>
    apiRequest<EvaluatorAssignment>(
      `/v1/prekinder/evaluator-assignments/${assignmentId}/start`,
      {
        method: "POST",
        body: JSON.stringify({ expectedVersion, operationId: crypto.randomUUID() }),
      },
    ),
  submitEvaluatorAssignment: (assignmentId: string, expectedVersion: number) =>
    apiRequest<EvaluatorAssignment>(
      `/v1/prekinder/evaluator-assignments/${assignmentId}/submit`,
      {
        method: "POST",
        body: JSON.stringify({ expectedVersion, operationId: crypto.randomUUID() }),
      },
    ),
  controlTower: (processId: string, date: string) =>
    apiRequest<ControlTowerDay>(
      `/v1/prekinder/processes/${processId}/control-tower?date=${encodeURIComponent(date)}`,
    ),
  updateAttendance: (
    groupId: string,
    applicationId: string,
    input: {
      status: "PENDING" | "PRESENT" | "LATE" | "ABSENT" | "COULD_NOT_ENTER";
      reasonCode?: string | null;
      expectedVersion: number;
      operationId: string;
    },
  ) =>
    apiRequest<{
      groupId: string;
      applicationId: string;
      status: string;
      reasonCode: string | null;
      version: number;
      recordedAt: string;
    }>(`/v1/prekinder/groups/${groupId}/members/${applicationId}/attendance`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  report: (reportId: string) =>
    apiRequest<Report>(`/v1/prekinder/reports/${reportId}`),
  saveResponse: (
    reportId: string,
    criterionId: string,
    input: {
      optionId: string | null;
      notObserved: boolean;
      expectedVersion: number;
      operationId: string;
    },
  ) =>
    apiRequest<Report>(
      `/v1/prekinder/reports/${reportId}/criteria/${criterionId}`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
    ),
  saveNote: (
    reportId: string,
    content: string,
    expectedVersion: number,
    operationId: string,
  ) =>
    apiRequest<Report>(`/v1/prekinder/reports/${reportId}/note`, {
      method: "PUT",
      body: JSON.stringify({ content, expectedVersion, operationId }),
    }),
  completeReport: (reportId: string, expectedVersion: number) =>
    apiRequest<Report>(`/v1/prekinder/reports/${reportId}/completion`, {
      method: "PUT",
      body: JSON.stringify({ expectedVersion }),
    }),
  decide: (
    applicationId: string,
    decision: "ACCEPTED" | "REJECTED" | "WAITLIST",
    note: string,
  ) =>
    apiRequest(`/v1/prekinder/applications/${applicationId}/decision`, {
      method: "PUT",
      body: JSON.stringify({ decision, note }),
    }),
  schedulePublication: (processId: string, scheduledAt: string) =>
    apiRequest(`/v1/prekinder/processes/${processId}/publication-batches`, {
      method: "POST",
      body: JSON.stringify({ scheduledAt }),
    }),
  dashboard: (processId: string) =>
    apiRequest<DashboardMetrics>(
      `/v1/prekinder/processes/${processId}/dashboard`,
    ),
  myResults: () => apiRequest<PublishedResult[]>("/v1/prekinder/me/results"),
  uploadDocument: (applicationId: string, category: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiRequest(
      `/v1/prekinder/applications/${applicationId}/documents?category=${encodeURIComponent(category)}`,
      { method: "POST", body },
    );
  },
};

export function websocketUrl(): string {
  const url = new URL(baseUrl());
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/v1/prekinder/realtime";
  url.search = "";
  return url.toString();
}
