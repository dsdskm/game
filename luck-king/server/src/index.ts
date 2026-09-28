import "dotenv/config";
import { Pool } from "pg";
import { createApp } from "./app.js";
import { PostgresStore } from "./store.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required. Run pnpm db:migrate before starting the server.");
const port = Number(process.env.PORT ?? 4000);
const pool = new Pool({ connectionString });
const store = new PostgresStore(pool);
const app = createApp(store);

app.listen(port, () => console.log(`LuckKing API listening on http://localhost:${port}`));