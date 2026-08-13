import type { AdmissionProcess, DashboardMetrics, EvaluationGroup, FlowApplication, Room, Wave } from "../services/api";

export const mockProcess: AdmissionProcess = {
  processId: "demo-process-2027", academicYear: 2027,
  name: "Admisión Prekínder 2027", status: "PUBLISHED",
  startsAt: "2026-08-01T12:00:00.000Z", endsAt: "2026-12-31T23:59:59.000Z",
  version: 1, applicationCount: 210, acceptingApplications: true,
};

export const mockRooms: Room[] = Array.from({ length: 10 }, (_, index) => ({
  roomId: `demo-room-${index + 1}`, processId: mockProcess.processId,
  code: `PK-${index + 1}`, name: `Sala ${index + 1}`, capacity: 3,
  active: true, version: 1,
}));

const firstNames = ["Amalia", "Bruno", "Clara", "Diego", "Emilia", "Felipe", "Gabriela", "Hugo", "Inés", "Joaquín", "Laura", "Mateo", "Noelia", "Óscar", "Paz", "Rafael", "Sofía", "Tomás", "Úrsula", "Vicente", "Zoe"];
const paternalNames = ["Rojas", "Méndez", "Fuentes", "Navarro", "Cortés", "Araya", "Muñoz", "Salinas", "Valdés", "Paredes"];
const maternalNames = ["Silva", "Leiva", "Pinto", "Reyes", "Vega", "Soto", "Lagos", "Bravo", "Parra", "Mora"];

export const mockApplications: FlowApplication[] = Array.from({ length: 210 }, (_, index) => ({
  applicationId: `demo-application-${index + 1}`,
  applicantId: `demo-applicant-${index + 1}`,
  processId: mockProcess.processId,
  waveId: "demo-wave",
  status: "IN_REVIEW",
  eligibilityCategory: "NEW_FAMILIES",
  eligibilityStatus: "VERIFIED",
  version: 1,
  declarationVersion: 1,
  identity: {
    rut: `00.${String(100 + Math.floor(index / 100)).padStart(3, "0")}.${String(index + 1).padStart(3, "0")}-D`,
    firstName: firstNames[index % firstNames.length],
    paternalLastName: paternalNames[Math.floor(index / firstNames.length) % paternalNames.length],
    maternalLastName: maternalNames[(index * 3) % maternalNames.length],
    birthDate: "2023-01-15",
    familyEmail: `familia${index + 1}@demo.invalid`, fatherEmail: "", motherEmail: "",
  },
  createdAt: "2026-08-01T12:00:00.000Z",
}));

const times = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00"];
const statuses = ["IN_PROGRESS", "REVIEW", "CONFIRMED", "RECEPTION", "DRAFT", "COMPLETED", "CONFIRMED"];

export function createMockGroups(date: string): EvaluationGroup[] {
  return mockRooms.flatMap((room, roomIndex) => times.map((time, timeIndex) => {
    const groupIndex = roomIndex * times.length + timeIndex;
    const startsAt = new Date(`${date}T${time}:00-04:00`);
    return {
      groupId: `demo-group-${groupIndex + 1}`,
      processId: mockProcess.processId,
      roomId: room.roomId,
      roomName: room.name,
      stage: "GROUP_3" as const,
      code: `G${String(groupIndex + 1).padStart(3, "0")}`,
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + 30 * 60_000).toISOString(),
      capacity: 3,
      requiredEvaluators: 3,
      status: statuses[(groupIndex + roomIndex) % statuses.length],
      version: 1,
      memberIds: mockApplications.slice(groupIndex * 3, groupIndex * 3 + 3).map((app) => app.applicationId),
      evaluatorIds: [`demo-evaluator-${roomIndex + 1}-1`, `demo-evaluator-${roomIndex + 1}-2`, `demo-evaluator-${roomIndex + 1}-3`],
    };
  }));
}

export const mockWaves: Wave[] = [{
  waveId: "demo-wave", processId: mockProcess.processId,
  waveType: "NEW_FAMILIES", position: 1, status: "PUBLISHED",
  opensAt: "2026-08-01T12:00:00.000Z", closesAt: "2026-12-31T23:59:59.000Z",
  version: 1, active: true,
}];

export const mockMetrics: DashboardMetrics = {
  applications: 210, eligibilityPending: 0, groupsToday: 70,
  reportsPending: 42, decisionsReady: 11,
};
