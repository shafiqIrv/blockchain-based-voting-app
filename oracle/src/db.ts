import { SSOUserInfo } from "./sso";

export class Database {
    private users: Map<string, SSOUserInfo & { password: string }>;

    constructor() {
        this.users = new Map();

        // Seed some mock users
        this.addUser({
            nim: "13521001",
            name: "John Doe",
            email: "john@mahasiswa.itb.ac.id",
            faculty: "STEI",
            major: "Informatika",
            status: "active",
            password: "password123"
        });

        this.addUser({
            nim: "13521002",
            name: "Jane Smith",
            email: "jane@mahasiswa.itb.ac.id",
            faculty: "STEI",
            major: "Sistem dan Teknologi Informasi",
            status: "active",
            password: "password123"
        });
    }

    private addUser(user: SSOUserInfo & { password: string }) {
        this.users.set(user.nim, user);
    }

    async authenticate(nim: string, password: string): Promise<SSOUserInfo | null> {
        const user = this.users.get(nim);

        if (user && user.password === password) {
            // Return user info without password
            const { password: _, ...userInfo } = user;
            return userInfo;
        }

        return null;
    }
}
