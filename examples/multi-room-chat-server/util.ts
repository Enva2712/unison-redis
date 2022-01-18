import { createServer as createHTTPServer } from "http";
import { WebSocketServer, RawData } from "ws";
import { filter, partition, Observable, Subject, OperatorFunction } from "rxjs";
import { is, Struct } from "superstruct";
import {
  ClientEvent,
  ClientEventSubscribe,
  ClientEventUnsubscribe,
  ClientEventSendMessage,
  ClientEventSetUsername,
} from "./interface";

export const predicateFor =
  <T>(struct: Struct<T>) =>
  (val: unknown): val is T =>
    is(val, struct);

// Helper for clientEventsByType
const type = <T extends ClientEvent>(
  type: T["type"]
): OperatorFunction<ClientEvent, T> => filter((e): e is T => e.type === type);

export function clientEventsByType(source: Observable<unknown>) {
  const [valid$, invalid$] = partition(source, predicateFor(ClientEvent));

  return {
    invalid$,
    subscribe$: valid$.pipe(type<ClientEventSubscribe>("subscribe")),
    unsubscribe$: valid$.pipe(type<ClientEventUnsubscribe>("unsubscribe")),
    sendMessage$: valid$.pipe(type<ClientEventSendMessage>("send-message")),
    setUsername$: valid$.pipe(type<ClientEventSetUsername>("set-username")),
  };
}

export function filterByRoom<T extends { room: string }>(
  room: string
): OperatorFunction<T, T> {
  return filter((event) => event.room === room);
}

export function createServer(
  onConnection: (clientMessages$: Observable<RawData>) => Observable<string>
) {
  const server = createHTTPServer();
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    const clientMessages$ = new Subject<RawData>();
    ws.on("message", (message) => clientMessages$.next(message));
    ws.on("error", (err) => clientMessages$.error(err));
    ws.on("close", () => clientMessages$.complete());

    const replies$ = onConnection(clientMessages$);
    replies$.subscribe({
      next: (message) => {
        ws.send(message);
        console.log("sending", message);
      },
      error(err) {
        console.error(err);
        ws.close();
      },
      complete: () => ws.close(),
    });
  });

  server.on("request", (req, res) => {
    res.writeHead(200);
    res.end("Connect over ws to send and recieve events");
  });

  return server;
}
