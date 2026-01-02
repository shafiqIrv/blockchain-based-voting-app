import { Context, Next } from "hono";
import jwt from "jsonwebtoken";

export interface AuthUser {
	email: string;
	name: string;
	tokenIdentifier: string;
	electionId: string;
	role?: "admin" | "voter";
}

declare module "hono" {
	interface ContextVariableMap {
		user: AuthUser;
	}
}

export async function authMiddleware(c: Context, next: Next) {
	const authHeader = c.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json({ error: "Unauthorized: No token provided" }, 401);
	}

	const token = authHeader.substring(7);

	try {
		const decoded = jwt.verify(
			token,
			process.env.JWT_SECRET || "default-secret"
		) as AuthUser;

		c.set("user", decoded);
		await next();
	} catch (error) {
		return c.json({ error: "Unauthorized: Invalid token" }, 401);
	}
}

export function getUser(c: Context): AuthUser {
	return c.get("user");
}
