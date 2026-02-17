import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import bcrypt from "bcryptjs";

function generateToken(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 64; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

export const signIn = mutation({
    args: {
        email: v.string(),
        password: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();

        if (!user) {
            throw new Error("Неверный email или пароль.");
        }

        const valid = bcrypt.compareSync(args.password, user.passwordHash);
        if (!valid) {
            throw new Error("Неверный email или пароль.");
        }

        // Clean up old sessions for this user
        const oldSessions = await ctx.db
            .query("sessions")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .collect();
        for (const session of oldSessions) {
            await ctx.db.delete(session._id);
        }

        const token = generateToken();
        const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

        await ctx.db.insert("sessions", {
            userId: user._id,
            token,
            expiresAt,
        });

        return {
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
            },
        };
    },
});

export const signOut = mutation({
    args: {
        token: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .unique();

        if (session) {
            await ctx.db.delete(session._id);
        }

        return { success: true };
    },
});

export const getSession = query({
    args: {
        token: v.string(),
    },
    handler: async (ctx, args) => {
        if (!args.token) return null;

        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .unique();

        if (!session || session.expiresAt < Date.now()) {
            return null;
        }

        const user = await ctx.db.get(session.userId);
        if (!user) return null;

        return {
            id: user._id,
            email: user.email,
            role: user.role,
            dailyAssignmentsLimit: user.dailyAssignmentsLimit,
            sentToday: user.sentToday ?? (user as any).subscribedToday ?? 0,
            sentTotal: user.sentTotal ?? (user as any).subscribedTotal ?? 0,
        };
    },
});

// Utility: seed an admin user (run once from dashboard or script)
export const seedAdmin = mutation({
    args: {
        email: v.string(),
        password: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();

        if (existing) {
            throw new Error("User already exists");
        }

        const passwordHash = bcrypt.hashSync(args.password, 10);

        await ctx.db.insert("users", {
            email: args.email,
            passwordHash,
            role: "admin",
            dailyAssignmentsLimit: 0,
            sentToday: 0,
            sentTotal: 0,
        });

        return { success: true };
    },
});
