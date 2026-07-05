/**
 * Cola de refresh reactivo para interceptores HTTP.
 *
 * Cuando varias requests fallan con 401/TOKEN_EXPIRED simultáneamente, sólo
 * UNA debe disparar `POST /api/auth/refresh`. Las demás esperan en la cola y,
 * una vez el refresh termina, se reintentan con el nuevo access token.
 *
 * Uso típico (Axios):
 *
 *   const refreshQueue = createRefreshQueue(async () => {
 *     const { data } = await http.post('/api/auth/refresh');
 *     authStore.updateAccessToken(data.token, data.expiresIn, data.user);
 *     return data.token;
 *   });
 *
 *   // En el interceptor de respuesta:
 *   if (isAccessExpired(status, code) && !original._retry) {
 *     original._retry = true;
 *     const newToken = await refreshQueue.run();
 *     if (!newToken) throw error;
 *     original.headers.Authorization = `Bearer ${newToken}`;
 *     return http(original);
 *   }
 */
export interface RefreshQueueHandle<T> {
  /** Devuelve el resultado del refresh, o null si el refresh falló. */
  run(): Promise<T | null>;
  /** Indica si hay un refresh en curso. */
  isRefreshing(): boolean;
}

export interface CreateRefreshQueueOptions<T> {
  /**
   * Llama al endpoint de refresh. Debe propagar errores para que la cola los
   * procese (no devolver null en éxito).
   */
  refresh: () => Promise<T>;
  /** Callback cuando el refresh falla — limpiar store, redirigir a login, etc. */
  onFailure?: (error: unknown) => void;
}

export function createRefreshQueue<T>(options: CreateRefreshQueueOptions<T>): RefreshQueueHandle<T> {
  let refreshing: Promise<T | null> | null = null;

  return {
    isRefreshing: () => Boolean(refreshing),
    run: () => {
      if (!refreshing) {
        refreshing = options
          .refresh()
          .then((value) => value)
          .catch((err) => {
            options.onFailure?.(err);
            return null;
          })
          .finally(() => {
            refreshing = null;
          });
      }
      return refreshing;
    },
  };
}

