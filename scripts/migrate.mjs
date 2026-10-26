import { database, migrate } from "../server/db.js";
const db = database(process.env.DATABASE_URL);
try {
  await migrate(db);
  console.log("Database migrations complete");
} finally {
  await db.close();
}
