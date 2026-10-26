import { database } from "./db.js";
import { configuration } from "./config.js";
import { createApp } from "./app.js";
const db = database(process.env.DATABASE_URL);
await db.query("SELECT version FROM schema_migrations WHERE version=1");
const config = configuration();
const app = await createApp(db, config);
const server = app.listen(
  {
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || "127.0.0.1",
    backlog: 2048,
  },
  () => console.log(`Bank portal ready at ${config.origin}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await db.close();
      process.exit(0);
    }),
  );
