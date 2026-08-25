import type { EvaluatorAgenda } from "../../services/api";

const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
  }).format(new Date());

function futureDate(hours = 0) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

export function isMockMode(): boolean {
  return import.meta.env.DEV && sessionStorage.getItem("pk-mock-mode") === "1";
}

export function setMockMode() {
  sessionStorage.setItem("pk-mock-mode", "1");
}

export function clearMockMode() {
  sessionStorage.removeItem("pk-mock-mode");
}

export function buildMockAgenda(profile: string): EvaluatorAgenda {
  return {
    profile: {
      actorId: "mock-evaluator",
      instrumentCode: profile,
      instrumentName: profile,
    },
    assignments: [
      {
        assignmentId: `mock-${profile.toLowerCase()}`,
        instrumentCode: profile,
        status: "ASSIGNED",
        version: 1,
        group: {
          groupId: "mock-group-1",
          processId: "mock-process",
          roomId: "mock-room-1",
          roomName: "Sala A1",
          stage: "GROUP_3",
          code: "G001",
          startsAt: futureDate(1),
          endsAt: futureDate(1.5),
          capacity: 3,
          requiredEvaluators: 3,
          status: "CONFIRMED",
          version: 1,
          memberIds: ["mock-app-1", "mock-app-2", "mock-app-3"],
          evaluatorIds: ["mock-eval-1"],
        },
        reports: [
          { reportId: "r1", applicationId: "mock-app-1", applicantName: "Amalia Rojas Silva", status: "PENDING", scores: [], comment: "" },
          { reportId: "r2", applicationId: "mock-app-2", applicantName: "Bruno Méndez Leiva", status: "PENDING", scores: [], comment: "" },
          { reportId: "r3", applicationId: "mock-app-3", applicantName: "Clara Fuentes Pinto", status: "PENDING", scores: [], comment: "" },
        ],
      },
    ],
  };
}
