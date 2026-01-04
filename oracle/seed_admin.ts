import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Locate Database
// Use process.cwd() assuming run from project root or navigate correctly
const dbDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
    console.log("Creating/Fixing data directory:", dbDir);
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "database.sqlite");
const db = new Database(dbPath);

console.log(`Connecting to database at: ${dbPath}`);

// Ensure table exists (in case running on fresh install)
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        nim TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        faculty TEXT NOT NULL,
        major TEXT NOT NULL,
        campus TEXT NOT NULL,
        entry_year INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        role TEXT NOT NULL DEFAULT 'voter'
    )
`);

// Define Admin User
const adminUser = {
    nim: "00000000",
    name: "System Administrator",
    email: "admin@itb.ac.id",
    password: "admin", // In production, hash this!
    faculty: "STEI",
    major: "Teknik Informatika",
    campus: "Ganesha",
    entry_year: 2020,
    status: "active",
    role: "admin"
};

// Insert or Update Admin
try {
    const check = db.prepare("SELECT * FROM users WHERE nim = ?").get(adminUser.nim);

    if (check) {
        console.log("Admin exists, updating role/password...");
        db.prepare(`
            UPDATE users 
            SET role = 'admin', password = @password, email = @email 
            WHERE nim = @nim
        `).run(adminUser);
    } else {
        console.log("Creating new admin account...");
        db.prepare(`
            INSERT INTO users (nim, name, email, password, faculty, major, campus, entry_year, status, role)
            VALUES (@nim, @name, @email, @password, @faculty, @major, @campus, @entry_year, @status, @role)
        `).run(adminUser);
    }

    console.log("✅ Admin account seeded successfully.");
    console.log("Credentials:");
    console.log(`NIM: ${adminUser.nim}`);
    console.log(`Password: ${adminUser.password}`);

} catch (err) {
    console.error("❌ Failed to seed admin:", err);
}
