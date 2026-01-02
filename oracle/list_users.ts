import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "oracle/data/database.sqlite");
const db = new Database(dbPath);

const users = db.prepare("SELECT nim, name, role FROM users").all();
console.table(users);
