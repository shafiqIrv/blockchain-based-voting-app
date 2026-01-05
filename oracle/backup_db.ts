import fs from "fs";
import path from "path";

// Configuration
const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "database.sqlite");
const BACKUP_DIR = path.join(DATA_DIR, "backups");

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Generate timestamped filename
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, "-");
const backupFile = path.join(BACKUP_DIR, `database_backup_${timestamp}.sqlite`);

try {
    if (fs.existsSync(DB_FILE)) {
        // Copy the file
        // Note: For a running SQLite DB, it's safer to use the SQLite backup API or CLI `.backup` command,
        // but for this dev setup, a file copy is usually sufficient if the DB isn't under heavy write load.
        // For production, consider using 'better-sqlite3' backup API.
        fs.copyFileSync(DB_FILE, backupFile);
        console.log(`✅ Database backed up to: ${backupFile}`);
    } else {
        console.error(`❌ Database file not found at: ${DB_FILE}`);
        process.exit(1);
    }
} catch (error) {
    console.error("❌ Backup failed:", error);
    process.exit(1);
}
