import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "oracle/data/database.sqlite");
const db = new Database(dbPath);

console.log("Updating role for user matching 'Shane'...");

const info = db.prepare("UPDATE users SET role = 'admin' WHERE name LIKE '%Shane%'").run();

if (info.changes > 0) {
    console.log(`Success! Updated ${info.changes} user(s) to admin.`);
    const updated = db.prepare("SELECT nim, name, role FROM users WHERE role = 'admin'").all();
    console.log(JSON.stringify(updated, null, 2));
} else {
    console.log("No user found matching 'Shane'. promoting ALL users just in case (Dev Mode).");
    db.prepare("UPDATE users SET role = 'admin'").run();
    console.log("All users are now admins.");
}
