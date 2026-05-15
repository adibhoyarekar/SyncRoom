import { NextAuthOptions, Session, User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";
import { AdapterUser } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
    ],
    pages: {
        signIn: '/', // Using landing page as sign-in
    },
    session: {
        strategy: "jwt" as const,
    },
    callbacks: {
        async jwt({ token, user }: { token: JWT, user?: User | AdapterUser }) {
            // If user exists, it means it's a new sign-in or a session refresh with a user object
            if (user) {
                token.id = user.id; // Attach user id to the token
            }
            return token;
        },
        async session({ session, token }: { session: Session, token: JWT }) {
            if (session.user) {
                // We'll attach the user id from token to the session user
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (session.user as any).id = token.id; // Use token.id which we set in the jwt callback
            }
            return session;
        }
    }
};
