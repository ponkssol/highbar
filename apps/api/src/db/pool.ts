import pg from "pg";
import { env } from "../lib/env.js";
export const db = new pg.Pool({ connectionString: env.DATABASE_URL });
