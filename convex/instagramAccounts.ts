import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getDailyTasks = query({
    args: {
        sessionToken: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .unique();
        if (!session || session.expiresAt < Date.now()) return [];

        const today = new Date().toISOString().split("T")[0];

        const tasks = await ctx.db
            .query("instagramAccounts")
            .withIndex("by_assignedTo_date_status", (q) =>
                q
                    .eq("assignedTo", session.userId)
                    .eq("assignmentDate", today)
                    .eq("status", "assigned")
            )
            .collect();

        return tasks.map((t) => ({
            id: t._id,
            userName: t.userName,
            fullName: t.fullName,
            profileUrl: `https://www.instagram.com/${t.userName}`,
            status: t.status,
        }));
    },
});

export const triggerAssignment = mutation({
    args: {
        sessionToken: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .unique();
        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Пользователь не найден.");
        }

        const user = await ctx.db.get(session.userId);
        if (!user) throw new Error("Пользователь не найден.");

        const today = new Date().toISOString().split("T")[0];
        const assignmentLimit = user.dailyAssignmentsLimit;

        // If limit is 0, clear all today's assignments
        if (assignmentLimit === 0) {
            const todaysAssignments = await ctx.db
                .query("instagramAccounts")
                .withIndex("by_assignedTo_date_status", (q) =>
                    q
                        .eq("assignedTo", user._id)
                        .eq("assignmentDate", today)
                )
                .collect();

            for (const a of todaysAssignments) {
                await ctx.db.patch(a._id, {
                    status: "available",
                    assignedTo: undefined,
                    assignmentDate: undefined,
                });
            }
            return { success: true };
        }

        // Count assigned + sent for today
        const assignedToday = await ctx.db
            .query("instagramAccounts")
            .withIndex("by_assignedTo_date_status", (q) =>
                q
                    .eq("assignedTo", user._id)
                    .eq("assignmentDate", today)
                    .eq("status", "assigned")
            )
            .collect();

        const sentToday = await ctx.db
            .query("instagramAccounts")
            .withIndex("by_assignedTo_date_status", (q) =>
                q
                    .eq("assignedTo", user._id)
                    .eq("assignmentDate", today)
                    .eq("status", "sent")
            )
            .collect();

        const generatedTodayCount = assignedToday.length + sentToday.length;

        if (generatedTodayCount >= assignmentLimit) {
            throw new Error("Дневной лимит уже достигнут. Новые задачи не назначены.");
        }

        const remainingTasks = assignmentLimit - generatedTodayCount;
        const tasksToAssignCount = Math.min(10, remainingTasks);

        // Find available accounts
        const availableAccounts = await ctx.db
            .query("instagramAccounts")
            .withIndex("by_status", (q) => q.eq("status", "available"))
            .take(tasksToAssignCount);

        for (const account of availableAccounts) {
            await ctx.db.patch(account._id, {
                status: "assigned",
                assignedTo: user._id,
                assignmentDate: today,
            });
        }

        return { success: true };
    },
});

export const markAsSent = mutation({
    args: {
        sessionToken: v.string(),
        instagramId: v.id("instagramAccounts"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .unique();
        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Не авторизован.");
        }

        const account = await ctx.db.get(args.instagramId);
        if (!account || account.assignedTo !== session.userId) {
            throw new Error("Аккаунт не найден или не назначен вам.");
        }

        await ctx.db.patch(args.instagramId, {
            status: "sent",
        });

        // Increment sent counts on user
        const user = await ctx.db.get(session.userId);
        if (user) {
            await ctx.db.patch(session.userId, {
                sentToday: (user.sentToday ?? (user as any).subscribedToday ?? 0) + 1,
                sentTotal: (user.sentTotal ?? (user as any).subscribedTotal ?? 0) + 1,
            });
        }

        return { success: true };
    },
});

export const markAsSkipped = mutation({
    args: {
        sessionToken: v.string(),
        instagramId: v.id("instagramAccounts"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .unique();
        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Не авторизован.");
        }

        const account = await ctx.db.get(args.instagramId);
        if (!account || account.assignedTo !== session.userId) {
            throw new Error("Аккаунт не найден или не назначен вам.");
        }

        await ctx.db.patch(args.instagramId, {
            status: "skip",
        });

        return { success: true };
    },
});

export const insertBatch = mutation({
    args: {
        sessionToken: v.string(),
        accounts: v.array(
            v.object({
                userName: v.string(),
                fullName: v.string(),
                status: v.string(),
            })
        ),
    },
    handler: async (ctx, args) => {
        // Verify admin
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .unique();
        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Не авторизован.");
        }
        const currentUser = await ctx.db.get(session.userId);
        if (!currentUser || currentUser.role !== "admin") {
            throw new Error("Только администраторы могут загружать аккаунты.");
        }

        let inserted = 0;
        let skipped = 0;
        const now = new Date().toISOString();

        for (const account of args.accounts) {
            const existing = await ctx.db
                .query("instagramAccounts")
                .withIndex("by_userName", (q) => q.eq("userName", account.userName))
                .first();

            if (existing) {
                skipped++;
                continue;
            }

            await ctx.db.insert("instagramAccounts", {
                userName: account.userName,
                fullName: account.fullName,
                status: "available",
                message: false,
                createdAt: now,
            });
            inserted++;
        }

        return { inserted, skipped };
    },
});

export const getStats = query({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .unique();
        if (!session || session.expiresAt < Date.now()) return null;

        const currentUser = await ctx.db.get(session.userId);
        if (!currentUser || currentUser.role !== "admin") return null;

        const available = await ctx.db
            .query("instagramAccounts")
            .withIndex("by_status", (q) => q.eq("status", "available"))
            .collect();

        const assigned = await ctx.db
            .query("instagramAccounts")
            .withIndex("by_status", (q) => q.eq("status", "assigned"))
            .collect();

        const sent = await ctx.db
            .query("instagramAccounts")
            .withIndex("by_status", (q) => q.eq("status", "sent"))
            .collect();

        const skipped = await ctx.db
            .query("instagramAccounts")
            .withIndex("by_status", (q) => q.eq("status", "skip"))
            .collect();

        return {
            available: available.length,
            assigned: assigned.length,
            sent: sent.length,
            skipped: skipped.length,
            total: available.length + assigned.length + sent.length + skipped.length,
        };
    },
});
