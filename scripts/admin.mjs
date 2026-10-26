import { database } from "../server/db.js";
import { provisionAdmin } from "../server/banking.js";
if (
  !process.env.ADMIN_LOGIN ||
  !process.env.ADMIN_PASSWORD ||
  process.env.ADMIN_PASSWORD.includes("REPLACE_")
)
  throw new Error("Set your own ADMIN_LOGIN and ADMIN_PASSWORD in .env first");
const db = database(process.env.DATABASE_URL);
try {
  await provisionAdmin(db, process.env.ADMIN_LOGIN, process.env.ADMIN_PASSWORD);
  console.log("Administrator created. Remove ADMIN_PASSWORD from .env.");
} finally {
  await db.close();
}
