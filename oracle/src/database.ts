import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import * as bcrypt from "bcryptjs";

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

        this.seedAdmin();
    }

    private seedAdmin() {
        const adminUser = {
            nim: "00000000",
            name: "System Administrator",
            email: "admin@itb.ac.id",
            password: "admin", // Passed as plain text, hashed by createUser
            faculty: "STEI",
            major: "Teknik Informatika",
            campus: "Ganesha",
            entry_year: 2020,
            status: "active",
            role: "admin"
        };

        try {
            const check = db.prepare("SELECT nim FROM users WHERE nim = ?").get(adminUser.nim);
            if (!check) {
                console.log("[Database] Seeding default admin account...");
                this.createUser(adminUser as any);
                console.log("[Database] Admin account '00000000' created.");
            }
        } catch (error) {
            console.error("[Database] Failed to seed admin:", error);
        }
    }

    createUser(user: Omit<User, "status"> | (Omit<User, "status" | "role"> & { role?: string })): { success: boolean; error?: string } {
        try {
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(user.password, salt);
            const role = (user as any).role || 'voter';

            const stmt = db.prepare(`
                INSERT INTO users (nim, name, email, password, faculty, major, campus, entry_year, status, role)
                VALUES (@nim, @name, @email, @password, @faculty, @major, @campus, @entry_year, 'active', @role)
            `);
            stmt.run({ ...user, password: hashedPassword, role });
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
        if (user && bcrypt.compareSync(password, user.password)) {
            return user;
        }
        return null;
    }

    getAllUsers(): Omit<User, "password">[] {
        const stmt = db.prepare("SELECT nim, name, email, faculty, major, campus, entry_year, status, role FROM users ORDER BY name ASC");
        return stmt.all() as Omit<User, "password">[];
    }
}
