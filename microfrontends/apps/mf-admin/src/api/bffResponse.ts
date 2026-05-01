/**
 * Parseo de respuestas admitia-bff.
 *
 * `services/http.ts` (import `../../services/http`) devuelve ya el cuerpo JSON
 * (= `axiosResponse.data`), no el `AxiosResponse` completo.
 */

import type { PaginatedResponse } from './evaluations.types';

export function isSpringPage<T = unknown>(
  body: unknown
): body is { content: T[] } & Record<string, unknown> {
  return (
    body !== null &&
    typeof body === 'object' &&
    Array.isArray((body as { content: unknown }).content)
  );
}

/**
 * Lista desde página Spring (`content`) o envoltorio `{ data: [] }` o un array suelto.
 * Útil también con `axios`: pasar `response.data`.
 */
export function extractBffList<T = unknown>(body: unknown): T[] {
  if (isSpringPage<T>(body)) {
    return body.content;
  }
  const o = body as { data?: unknown } | null;
  if (o && Array.isArray(o.data)) {
    return o.data as T[];
  }
  if (Array.isArray(body)) {
    return body as T[];
  }
  return [];
}

/**
 * Quita `{ success, data }` / `{ success, data, count }` sin romper páginas Spring
 * ni cuerpos planos (p. ej. GET /v1/applications/:id).
 */
export function unwrapBffData<T>(body: unknown): T {
  if (body === null || typeof body !== 'object') {
    return body as T;
  }
  const o = body as Record<string, unknown>;
  if (isSpringPage(body)) {
    return body as T;
  }
  if ('data' in o && o.data !== undefined) {
    if (o.success === true || o.success === false) {
      return o.data as T;
    }
    if (typeof o.count === 'number' && Array.isArray(o.data)) {
      return o.data as T;
    }
  }
  return body as T;
}

/** Normaliza GET /v1/evaluations cuando el BFF devuelve `{ success, data, content, count }`. */
export function evaluationsToPaginated<T>(body: Record<string, unknown>): PaginatedResponse<T> {
  const content = (
    Array.isArray(body.content) ? body.content : Array.isArray(body.data) ? body.data : []
  ) as T[];
  const n = content.length;
  const count = typeof body.count === 'number' ? body.count : n;
  return {
    content,
    totalElements: typeof body.totalElements === 'number' ? (body.totalElements as number) : count,
    totalPages: typeof body.totalPages === 'number' ? (body.totalPages as number) : 1,
    size: typeof body.size === 'number' ? (body.size as number) : n,
    number: typeof body.number === 'number' ? (body.number as number) : 0,
    first: body.first !== false,
    last: body.last !== false,
    numberOfElements: typeof body.numberOfElements === 'number' ? (body.numberOfElements as number) : n,
    empty: n === 0
  };
}
