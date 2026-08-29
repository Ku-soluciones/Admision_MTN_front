export type EvaluationJourney = {
  id: string;
  name: string;
  date: string;
};

function storageKey(processId: string) {
  return `prekinder.journeys.v1.${processId}`;
}

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
  }).format(new Date());
}

function defaultJourneyName(date: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  }).format(new Date(`${date}T12:00:00`));
}

export function loadJourneys(processId: string): EvaluationJourney[] {
  if (!processId) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(processId));
    const parsed = raw ? (JSON.parse(raw) as EvaluationJourney[]) : [];
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    // fall through to seeding a default journey
  }
  const date = today();
  const seeded: EvaluationJourney[] = [
    { id: crypto.randomUUID(), name: defaultJourneyName(date), date },
  ];
  saveJourneys(processId, seeded);
  return seeded;
}

export function saveJourneys(processId: string, journeys: EvaluationJourney[]) {
  if (!processId) return;
  window.localStorage.setItem(storageKey(processId), JSON.stringify(journeys));
}
