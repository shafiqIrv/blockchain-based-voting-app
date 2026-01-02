import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust path based on where we run it. If running from root, it is oracle/data... 
// But let's use absolute path relative to CWD to be safe or relative to this script.
// Data is in ../data from this script location (if in oracle/) or just use current directory approach.
// Let's assume running from root:
const dbPath = path.resolve(process.cwd(), "oracle/data/database.sqlite");
console.log("Reading DB from:", dbPath);

const db = new Database(dbPath);

const users = db.prepare("SELECT nim, name, role FROM users").all();
console.log(JSON.stringify(users, null, 2));
console.log("Total users:", users.length);
