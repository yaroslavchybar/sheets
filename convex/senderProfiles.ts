import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getForUser = query({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .unique();
        if (!session || session.expiresAt < Date.now()) return [];

        return await ctx.db
            .query("senderProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", session.userId))
            .collect();
    },
});

export const addProfile = mutation({
    args: {
        sessionToken: v.string(),
        igUsername: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .unique();
        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Не авторизован.");
        }

        const profileId = await ctx.db.insert("senderProfiles", {
            userId: session.userId,
            igUsername: args.igUsername,
        });

        return profileId;
    },
});

export const removeProfile = mutation({
    args: {
        sessionToken: v.string(),
        profileId: v.id("senderProfiles"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .unique();
        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Не авторизован.");
        }

        const profile = await ctx.db.get(args.profileId);
        if (!profile || profile.userId !== session.userId) {
            throw new Error("Профиль не найден.");
        }

        // Optional: Reset accounts assigned to this profile back to available.
        const assignedAccounts = await ctx.db
            .query("instagramAccounts")
            .filter((q) => q.eq(q.field("senderProfileId"), args.profileId))
            .collect();

        for (const account of assignedAccounts) {
            if (account.status === "assigned") {
                await ctx.db.patch(account._id, {
                    status: "available",
                    senderProfileId: undefined,
                    assignmentDate: undefined,
                });
            }
        }

        await ctx.db.delete(args.profileId);
        return { success: true };
    },
});
