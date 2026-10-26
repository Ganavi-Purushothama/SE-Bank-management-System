import { testDatabase, adminPassword, customerPassword } from "./fixture.js";
import { provisionAdmin, banking } from "../server/banking.js";
import { createApp } from "../server/app.js";
const db = await testDatabase();
await provisionAdmin(db, "test-admin", adminPassword);
const config = {
  origin: "http://127.0.0.1:4173",
  production: false,
  minInitial: 50000,
  minBalance: 0,
  sessionMinutes: 30,
};
const actor = (
  await db.query("SELECT id,role FROM users WHERE login='test-admin'")
).rows[0];
const account = await banking(db, config).create(
  {
    name: "Fictional Mira",
    phone: "1234567890",
    address: "Example Street",
    initialDeposit: "1000",
    password: customerPassword,
  },
  actor,
);
await db.query("UPDATE users SET login='6000000000001' WHERE login=$1", [
  account.number,
]);
await db.query("UPDATE accounts SET number='6000000000001' WHERE id=$1", [
  account.id,
]);
const app = await createApp(db, config);
const server = app.listen(4173, "127.0.0.1", () =>
  console.log("Isolated browser test server ready"),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await db.close();
      process.exit(0);
    }),
  );
