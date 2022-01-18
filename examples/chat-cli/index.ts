import { syncOverRedis } from "unison-redis";
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
      rl.on("line", (line) => subscriber.next(line));
      rl.on("error", (err) => subscriber.error(err));
      rl.on("close", () => subscriber.complete());
    });

    await redisConnection;

    messages$
      .pipe(
        map((message) => ({ message, username })),
        syncOverRedis(client, "messages"),
        filter((message) => message.username !== username),
        map(({ username, message }) => `${username}: ${message}`)
      )
      .forEach(console.log);
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
