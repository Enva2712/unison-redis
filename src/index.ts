import { Observable, Subscription, OperatorFunction } from "rxjs";
import { RedisClientType } from "redis";

export function syncOverRedis<T>(
  publishClient: RedisClientType<any, any>,
  channel: string
): OperatorFunction<T, T> {
  return (observable) =>
    new Observable((subscriber) => {
      let subscriptionClient: RedisClientType<any, any> | null =
        publishClient.duplicate();
      let inputSubscription: Subscription | null = null;

      function cleanup(): void {
        subscriptionClient?.disconnect();
        inputSubscription?.unsubscribe();

        // drop references to allow gc of objects
        inputSubscription = null;
        subscriptionClient = null;
      }

      subscriptionClient.connect().catch((err) => {
        subscriber.error(err);
        cleanup();
      });

      // @ts-ignore the redis client isn't properly typed
      subscriptionClient.on("error", (err: unknown) => {
        subscriber.error(err);
        cleanup();
      });

      subscriptionClient.subscribe(channel, (message) => {
        subscriber.next(JSON.parse(message));
      });

      inputSubscription = observable.subscribe({
        next(message) {
          publishClient.publish(channel, JSON.stringify(message));
        },
        error(err) {
          subscriber.error(err);
          cleanup();
        },
        complete() {
          cleanup();
        },
      });
    });
}

// TODO: switch to subject based impl?
