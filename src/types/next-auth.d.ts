import type { UserRole } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

// Extensão dos tipos do NextAuth para incluir role e phone
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      phone?: string;
    };
  }

  interface User {
    role: UserRole;
    phone?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    phone?: string;
  }
}
