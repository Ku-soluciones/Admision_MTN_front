import { useEffect, useRef, useState } from 'react';
import { refreshAccessToken } from '../services/api';
import {
  PrekinderRealtimeClient,
  type MinimalEvent,
  type RealtimeState,
} from '../services/realtime';

export function usePrekinderRealtimeSync(
  entityId: string | null | undefined,
  onEvent: (event: MinimalEvent) => void,
  scope: 'actor' | 'process' = 'actor',
): RealtimeState {
  const [state, setState] = useState<RealtimeState>('connecting');
  const clientRef = useRef<PrekinderRealtimeClient | null>(null);
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    let cancelled = false;
    const client = new PrekinderRealtimeClient(setState, (event) => callbackRef.current(event));
    clientRef.current = client;
    void refreshAccessToken()
      .then((token) => {
        if (cancelled) return;
        if (token) client.connect();
        else setState('closed');
      })
      .catch(() => {
        if (!cancelled) setState('closed');
      });
    return () => {
      cancelled = true;
      void client.disconnect();
      clientRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!entityId || state !== 'live') return;
    const watch = scope === 'process'
      ? clientRef.current?.watchProcess(entityId)
      : clientRef.current?.watchActor(entityId);
    void watch?.catch(() => setState('degraded'));
  }, [entityId, scope, state]);

  return state;
}
