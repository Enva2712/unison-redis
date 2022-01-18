import { syncOverRedis } from "../src";
import { createInterface } from "readline";
import { createClient } from "redis";
import { Observable, Subject, interval } from "rxjs";
import { map, filter } from "rxjs/operators";

(async function main() {
  const client = await createClient();

  // start connecting asap, but don't wait on connection until we need it
  const redisConnection = client.connect();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Username: ", async (username) => {
    const messages$ = new Observable<string>((subscriber) => {
      rl.on("line", subscriber.next);
      rl.on("error", subscriber.error);
      rl.on("close", subscriber.complete);
    });

    await redisConnection;

    messages$
      .pipe(
        map((message) => ({ message, username })),
        syncOverRedis(client, "all-messages"),
        filter((message) => message.username !== username),
        map(({ username, message }) => `${username}: ${message}`)
      )
      .forEach(console.log);
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
