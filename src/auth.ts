import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { defaultModuleForRole } from "@/lib/roles";

declare module "next-auth" {
  interface User {
    username: string;
    role: UserRole;
    hospitalId: string;
    hospitalName: string;
    clinicId: string | null;
    displayName: string;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      role: UserRole;
      hospitalId: string;
      hospitalName: string;
      clinicId: string | null;
      displayName: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: UserRole;
    hospitalId: string;
    hospitalName: string;
    clinicId: string | null;
    displayName: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username =
          typeof credentials?.username === "string"
            ? credentials.username.trim()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!username || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username },
          include: { hospital: true },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const valid = await compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          role: user.role,
          hospitalId: user.hospitalId,
          hospitalName: user.hospital.name,
          clinicId: user.clinicId,
          displayName: user.displayName,
          name: user.displayName,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.username = user.username;
        token.role = user.role;
        token.hospitalId = user.hospitalId;
        token.hospitalName = user.hospitalName;
        token.clinicId = user.clinicId;
        token.displayName = user.displayName;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id,
        username: token.username,
        role: token.role,
        hospitalId: token.hospitalId,
        hospitalName: token.hospitalName,
        clinicId: token.clinicId,
        displayName: token.displayName,
        name: token.displayName,
      };
      return session;
    },
  },
  trustHost: true,
});

export { defaultModuleForRole };
