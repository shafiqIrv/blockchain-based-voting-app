import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Ensure data directory exists
const dbPath = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath);
}

const db = new Database(path.join(dbPath, "database.sqlite"));

export interface User {
    nim: string;
    name: string;
    email: string;
    password: string;
    faculty: string;
    major: string;
    campus: "Ganesha" | "Jatinangor" | "Cirebon";
    entry_year: number;
    status: "active" | "inactive" | "graduated";
    role: "admin" | "voter";
}

export class SQLiteDatabase {
    constructor() {
        this.init();
    }

    private init() {
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

        // Migration: Ensure status column exists
        try {
            db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
        } catch (error) {
            // Ignore error if column already exists
        }

        // Migration: Ensure role column exists
        try {
            db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'voter'");
        } catch (error) {
            // Ignore error if column already exists
        }
    }

    createUser(user: Omit<User, "status" | "role">): { success: boolean; error?: string } {
        try {
            const stmt = db.prepare(`
                INSERT INTO users (nim, name, email, password, faculty, major, campus, entry_year, status, role)
                VALUES (@nim, @name, @email, @password, @faculty, @major, @campus, @entry_year, 'active', 'voter')
            `);
            stmt.run(user);
            return { success: true };
        } catch (error: any) {
            if (error.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
                return { success: false, error: "NIM already exists" };
            }
            if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
                return { success: false, error: "Email already exists" };
            }
            return { success: false, error: error.message };
        }
    }

    getUser(nim: string): User | undefined {
        const stmt = db.prepare("SELECT * FROM users WHERE nim = ?");
        return stmt.get(nim) as User | undefined;
    }

    authenticate(nim: string, password: string): User | null {
        const user = this.getUser(nim);
        if (user && user.password === password) {
            return user;
        }
        return null;
    }

    getAllUsers(): Omit<User, "password">[] {
        const stmt = db.prepare("SELECT nim, name, email, faculty, major, campus, entry_year, status, role FROM users ORDER BY name ASC");
        return stmt.all() as Omit<User, "password">[];
    }
}
