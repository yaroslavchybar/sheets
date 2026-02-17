import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import bcrypt from "bcryptjs";

export const getAllUsersWithRoles = query({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        // Verify admin
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .unique();
        if (!session || session.expiresAt < Date.now()) return [];

        const currentUser = await ctx.db.get(session.userId);
        if (!currentUser || currentUser.role !== "admin") return [];

        const users = await ctx.db.query("users").collect();

        return users
            .map((u) => ({
                id: u._id,
                email: u.email,
                role: u.role,
                daily_assignments_limit: u.dailyAssignmentsLimit,
                sent_today_count: u.sentToday ?? (u as any).subscribedToday ?? 0,
                sent_total_count: u.sentTotal ?? (u as any).subscribedTotal ?? 0,
            }))
            .sort((a, b) => a.email.localeCompare(b.email));
    },
});

export const createUser = mutation({
    args: {
        sessionToken: v.string(),
        email: v.string(),
        password: v.string(),
        role: v.union(v.literal("admin"), v.literal("member")),
    },
    handler: async (ctx, args) => {
        // Verify admin
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .unique();
        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Вы должны быть авторизованы.");
        }

        const currentUser = await ctx.db.get(session.userId);
        if (!currentUser || currentUser.role !== "admin") {
            throw new Error("У вас нет прав для создания пользователей.");
        }

        // Check if email already exists
        const existing = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();
        if (existing) {
            throw new Error("Пользователь с таким email уже существует.");
        }

        const passwordHash = bcrypt.hashSync(args.password, 10);

        await ctx.db.insert("users", {
            email: args.email,
            passwordHash,
            role: args.role,
            dailyAssignmentsLimit: args.role === "member" ? 10 : 0,
            sentToday: 0,
            sentTotal: 0,
        });

        return { success: true };
    },
});

export const updateUserRole = mutation({
    args: {
        sessionToken: v.string(),
        userId: v.id("users"),
        role: v.union(v.literal("admin"), v.literal("member")),
    },
    handler: async (ctx, args) => {
        // Verify admin
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .unique();
        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Вы должны быть авторизованы.");
        }

        const currentUser = await ctx.db.get(session.userId);
        if (!currentUser || currentUser.role !== "admin") {
            throw new Error("У вас нет прав для изменения ролей.");
        }

        await ctx.db.patch(args.userId, { role: args.role });

        return { success: true };
    },
});

export const updateUserAssignmentLimit = mutation({
    args: {
        sessionToken: v.string(),
        userId: v.id("users"),
        newLimit: v.number(),
    },
    handler: async (ctx, args) => {
        // Verify admin
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .unique();
        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Вы должны быть авторизованы.");
        }

        const currentUser = await ctx.db.get(session.userId);
        if (!currentUser || currentUser.role !== "admin") {
            throw new Error("У вас нет прав для изменения настроек.");
        }

        const today = new Date().toISOString().split("T")[0];

        // Count pending assignments for today
        const pendingAssignments = await ctx.db
            .query("instagramAccounts")
            .withIndex("by_assignedTo_date_status", (q) =>
                q
                    .eq("assignedTo", args.userId)
                    .eq("assignmentDate", today)
                    .eq("status", "assigned")
            )
            .collect();

        const targetUser = await ctx.db.get(args.userId);
        if (!targetUser) throw new Error("Пользователь не найден.");

        const sentTodayCount = targetUser.sentToday ?? (targetUser as any).subscribedToday ?? 0;
        const totalGeneratedToday = pendingAssignments.length + sentTodayCount;

        // If new limit is less than what's already generated, remove excess pending
        if (args.newLimit < totalGeneratedToday) {
            const assignmentsToRemove = totalGeneratedToday - args.newLimit;
            const toRemove = pendingAssignments
                .slice(-assignmentsToRemove); // take from the end (newest)

            for (const assignment of toRemove) {
                await ctx.db.patch(assignment._id, {
                    status: "available",
                    assignedTo: undefined,
                    assignmentDate: undefined,
                });
            }
        }

        await ctx.db.patch(args.userId, {
            dailyAssignmentsLimit: args.newLimit,
        });

        return { success: true };
    },
});

export const deleteUser = mutation({
    args: {
        sessionToken: v.string(),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        // Verify admin
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .unique();
        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Вы должны быть авторизованы.");
        }

        const currentUser = await ctx.db.get(session.userId);
        if (!currentUser || currentUser.role !== "admin") {
            throw new Error("У вас нет прав для удаления пользователей.");
        }

        // Prevent self-deletion
        if (args.userId === session.userId) {
            throw new Error("Вы не можете удалить свой собственный аккаунт.");
        }

        // Delete user's sessions
        const userSessions = await ctx.db
            .query("sessions")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();
        for (const s of userSessions) {
            await ctx.db.delete(s._id);
        }

        // Delete the user
        await ctx.db.delete(args.userId);

        return { success: true };
    },
});
