import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import { prekinderApi, refreshAccessToken, websocketUrl } from './api';

export type RealtimeState = 'connecting' | 'live' | 'degraded' | 'closed';
export type MinimalEvent = { eventId: string; entityId: string; sequence: number; eventType: string };
export type Operation = {
  operationId: string;
  type: 'WATCH_EVALUATION' | 'WATCH_ACTOR' | 'WATCH_PROCESS' | 'COMMENT_CREATE' | 'COMMENT_REVISE' | 'COMMENT_TOMBSTONE';
  evaluationId?: string;
  actorId?: string;
  processId?: string;
  commentId?: string;
  baseRevision?: number;
  content?: string;
  clientSequence: number;
};

export class PrekinderRealtimeClient {
  private client: Client | null = null;
  private subscriptions: StompSubscription[] = [];
  private pending = new Map<string, { resolve: (value: any) => void; reject: (reason: Error) => void; timer: number }>();
  private renewTimer: number | null = null;
  private sequence = 0;

  constructor(
    private readonly onState: (state: RealtimeState) => void,
    private readonly onEvent: (event: MinimalEvent) => void,
  ) {}

  connect() {
    this.onState('connecting');
    const client = new Client({
      webSocketFactory: () => new WebSocket(websocketUrl(), ['v12.stomp', 'v11.stomp']),
      reconnectDelay: 1_000,
      heartbeatIncoming: 20_000,
      heartbeatOutgoing: 20_000,
      connectionTimeout: 8_000,
      debug: () => undefined,
      beforeConnect: async () => {
        await refreshAccessToken();
        const issued = await prekinderApi.ticket();
        client.connectHeaders = { 'X-Prekinder-Ticket': issued.ticket };
      },
      onConnect: () => {
        this.subscriptions.forEach((subscription) => subscription.unsubscribe());
        this.subscriptions = [
          client.subscribe('/user/queue/prekinder/events', (message) => this.onEvent(JSON.parse(message.body))),
          client.subscribe('/user/queue/prekinder/acks', (message) => this.resolveAck(message)),
          client.subscribe('/user/queue/prekinder/errors', (message) => this.rejectAck(message)),
        ];
        this.onState('live');
        this.scheduleRenewal();
      },
      onStompError: () => this.onState('degraded'),
      onWebSocketClose: () => this.onState('degraded'),
      onWebSocketError: () => this.onState('degraded'),
    });
    this.client = client;
    client.activate();
  }

  async disconnect() {
    if (this.renewTimer) window.clearTimeout(this.renewTimer);
    this.pending.forEach(({ reject, timer }) => { window.clearTimeout(timer); reject(new Error('Conexión cerrada')); });
    this.pending.clear();
    await this.client?.deactivate();
  }

  watch(evaluationId: string) {
    return this.send({ operationId: crypto.randomUUID(), type: 'WATCH_EVALUATION', evaluationId });
  }

  watchActor(actorId: string) {
    return this.send({ operationId: crypto.randomUUID(), type: 'WATCH_ACTOR', actorId });
  }

  watchProcess(processId: string) {
    return this.send({ operationId: crypto.randomUUID(), type: 'WATCH_PROCESS', processId });
  }

  send(operation: Omit<Operation, 'clientSequence'>): Promise<any> {
    if (!this.client?.connected) return Promise.reject(new Error('Tiempo real no disponible'));
    const message = { ...operation, clientSequence: ++this.sequence };
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(message.operationId);
        reject(new Error('No llegó confirmación. La operación se verificará por REST.'));
      }, 8_000);
      this.pending.set(message.operationId, { resolve, reject, timer });
      this.client!.publish({ destination: '/app/prekinder/operations', body: JSON.stringify(message) });
    });
  }

  private resolveAck(message: IMessage) {
    const ack = JSON.parse(message.body);
    const pending = this.pending.get(ack.operationId);
    if (!pending) return;
    window.clearTimeout(pending.timer);
    this.pending.delete(ack.operationId);
    pending.resolve(ack);
  }

  private rejectAck(message: IMessage) {
    const error = JSON.parse(message.body);
    const pending = this.pending.get(error.operationId);
    if (!pending) return;
    window.clearTimeout(pending.timer);
    this.pending.delete(error.operationId);
    pending.reject(new Error(error.message || 'Operación rechazada'));
  }

  private scheduleRenewal() {
    if (this.renewTimer) window.clearTimeout(this.renewTimer);
    this.renewTimer = window.setTimeout(async () => {
      if (!this.client) return;
      await this.client.deactivate();
      this.onState('connecting');
      this.client.activate();
    }, 11 * 60_000 + 45_000);
  }
}
