
import { Hono } from "hono";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";

export const uploadRoutes = new Hono();

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
}

uploadRoutes.post("/", async (c) => {
    try {
        const body = await c.req.parseBody();
        const file = body["file"];

        if (!file || !(file instanceof File)) {
            return c.json({ error: "No file uploaded" }, 400);
        }

        // Validation (basic)
        const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
        if (!allowedTypes.includes(file.type)) {
            return c.json({ error: "Invalid file type. Only JPEG/PNG allowed." }, 400);
        }

        // Generate unique filename
        const extension = file.name.split(".").pop();
        const filename = `${uuidv4()}.${extension}`;
        const filepath = join(UPLOAD_DIR, filename);

        // Write file
        const buffer = await file.arrayBuffer();
        writeFileSync(filepath, Buffer.from(buffer));

        // Return URL (assuming served at /uploads)
        const protocol = c.req.header("x-forwarded-proto") || "http";
        const host = c.req.header("host");
        const url = `${protocol}://${host}/uploads/${filename}`;

        return c.json({ message: "Upload successful", url });
    } catch (error: any) {
        console.error("Upload failed:", error);
        return c.json({ error: "Upload failed: " + error.message }, 500);
    }
});
