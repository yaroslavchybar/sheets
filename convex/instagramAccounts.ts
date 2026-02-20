import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

export const getDailyTasks = query({
    args: {
        sessionToken: v.string(),
        senderProfileId: v.optional(v.id("senderProfiles")),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .unique();
        if (!session || session.expiresAt < Date.now()) return [];

        const today = new Date().toISOString().split("T")[0];

        let q = ctx.db
            .query("instagramAccounts")
            .withIndex("by_profile_date_status", (q) =>
                q
                    .eq("senderProfileId", args.senderProfileId!)
                    .eq("assignmentDate", today)
                    .eq("status", "assigned")
            );

        const tasks = await q.collect();

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
        senderProfileId: v.id("senderProfiles"),
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

        const profile = await ctx.db.get(args.senderProfileId);
        if (!profile || profile.userId !== session.userId) {
            throw new Error("Профиль не найден.");
        }

        const today = new Date().toISOString().split("T")[0];
        const assignmentLimit = user.dailyAssignmentsLimit;

        // If limit is 0, clear all today's assignments for this profile
        if (assignmentLimit === 0) {
            const todaysAssignments = await ctx.db
                .query("instagramAccounts")
                .withIndex("by_profile_date_status", (q) =>
                    q
                        .eq("senderProfileId", args.senderProfileId)
                        .eq("assignmentDate", today)
                )
                .collect();

            for (const a of todaysAssignments) {
                await ctx.db.patch(a._id, {
                    status: "available",
                    senderProfileId: undefined,
                    assignmentDate: undefined,
                });
            }
            return { success: true };
        }

        // Count assigned + sent for today for this profile
        const assignedToday = await ctx.db
            .query("instagramAccounts")
            .withIndex("by_profile_date_status", (q) =>
                q
                    .eq("senderProfileId", args.senderProfileId)
                    .eq("assignmentDate", today)
                    .eq("status", "assigned")
            )
            .collect();

        const sentToday = await ctx.db
            .query("instagramAccounts")
            .withIndex("by_profile_date_status", (q) =>
                q
                    .eq("senderProfileId", args.senderProfileId)
                    .eq("assignmentDate", today)
                    .eq("status", "sent")
            )
            .collect();

        const generatedTodayCount = assignedToday.length + sentToday.length;

        if (generatedTodayCount >= assignmentLimit) {
            throw new Error("Дневной лимит для этого профиля уже достигнут.");
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
                senderProfileId: args.senderProfileId,
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

        if (!account || !account.senderProfileId) {
            throw new Error("Аккаунт не найден.");
        }

        // Verify the profile belongs to this user
        const profile = await ctx.db.get(account.senderProfileId);
        if (!profile || profile.userId !== session.userId) {
            throw new Error("Профиль не найден или аккаунт не назначен профилю этого пользователя.");
        }

        await ctx.db.patch(args.instagramId, {
            status: "sent",
        });

        // Increment sent counts on user
        const user = await ctx.db.get(session.userId);
        if (user) {
            await ctx.db.patch(session.userId, {
                sentToday: (user.sentToday ?? 0) + 1,
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

        if (!account || !account.senderProfileId) {
            throw new Error("Аккаунт не найден.");
        }

        // Verify the profile belongs to this user
        const profile = await ctx.db.get(account.senderProfileId);
        if (!profile || profile.userId !== session.userId) {
            throw new Error("Профиль не найден или аккаунт не назначен профилю этого пользователя.");
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

export const resetUnassignedTasks = internalMutation({
    args: {},
    handler: async (ctx) => {
        const assignedTasks = await ctx.db
            .query("instagramAccounts")
            .withIndex("by_status", (q) => q.eq("status", "assigned"))
            .collect();

        for (const account of assignedTasks) {
            await ctx.db.patch(account._id, {
                status: "available",
                senderProfileId: undefined,
                assignmentDate: undefined,
            });
        }
    },
});

export const resetUserDailyStats = internalMutation({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();

        for (const user of users) {
            // Only update if they have sent tasks today
            if (user.sentToday && user.sentToday > 0) {
                const currentTotal = user.sentTotal ?? 0;
                await ctx.db.patch(user._id, {
                    sentTotal: currentTotal + user.sentToday,
                    sentToday: 0,
                });
            } else if (user.sentToday === undefined) {
                await ctx.db.patch(user._id, {
                    sentToday: 0,
                });
            }
        }
    },
});
