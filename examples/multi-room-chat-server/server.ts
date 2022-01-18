import { WebSocketServer, RawData } from "ws";
import {
  Observable,
  map,
  mergeMap,
  takeUntil,
  mergeWith,
  combineLatestWith,
} from "rxjs";
import {
  ServerEvent,
  ServerEventMessage,
  ServerEventInvalidClientEvent,
} from "./interface";
import { clientEventsByType, filterByRoom, createServer } from "./util";
import { createClient } from "redis";
import { syncOverRedis } from "../../src";

(async () => {
  const client = createClient();
  await client.connect();

  const server = createServer((rawMessages$) => {
    const { invalid$, subscribe$, unsubscribe$, sendMessage$, setUsername$ } =
      // This helper function splits up events based on their type, so we get separate streams for each kind
      clientEventsByType(
        rawMessages$.pipe(map((m) => JSON.parse(m.toString())))
      );

    // Tell the client when it sends us an invalid event
    const invalidEventReplies$ = invalid$.pipe(
      map<unknown, ServerEventInvalidClientEvent>((event) => ({
        type: "invalid-client-event",
        event,
      }))
    );

    // This observable is all the messages sent by every client
    const allMessages$ = setUsername$.pipe(
      combineLatestWith(sendMessage$),
      map(
        ([{ username }, { room, content }]): ServerEventMessage => ({
          type: "message",
          username,
          room,
          content,
        })
      ),
      syncOverRedis(client, "all-messages")
    );

    // Messages this client is subscribed to
    const subscribedMessages$: Observable<ServerEventMessage> = subscribe$.pipe(
      mergeMap(({ room }) =>
        allMessages$.pipe(
          filterByRoom(room),
          takeUntil(unsubscribe$.pipe(filterByRoom(room)))
        )
      )
    );

    // All the events we're sending back to the client
    return invalidEventReplies$.pipe(
      mergeWith(subscribedMessages$),
      map<ServerEvent, string>((event) => JSON.stringify(event))
    );
  });

  server.listen(8080);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
