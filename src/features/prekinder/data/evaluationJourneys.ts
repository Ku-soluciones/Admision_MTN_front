import type { EvaluationDay } from "../services/api";

export type EvaluationJourney = {
  id: string;
  name: string;
  date: string;
  version: number;
};

export type JourneyActionResult = { ok: true } | { ok: false; error: string };

export function journeyFromApi(day: EvaluationDay): EvaluationJourney {
  return { id: day.dayId, name: day.name, date: day.date, version: day.version };
}

export function journeyErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "EVALUATION_DAY_DATE_TAKEN":
      return "Ya existe una jornada con esa fecha para este proceso.";
    case "EVALUATION_DAY_HAS_GROUPS":
      return "No se puede eliminar: esta jornada ya tiene grupos asignados. Reasígnalos primero.";
    case "VERSION_CONFLICT":
      return "Otro coordinador modificó esta jornada. Actualiza la página e intenta de nuevo.";
    case "VALIDATION_ERROR":
      return "Revisa el nombre y la fecha ingresados.";
    default:
      return fallback;
  }
}
