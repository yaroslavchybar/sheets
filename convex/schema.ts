import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        email: v.string(),
        passwordHash: v.string(),
        role: v.union(v.literal("admin"), v.literal("member")),
        dailyAssignmentsLimit: v.number(),
        sentToday: v.optional(v.number()),
        sentTotal: v.optional(v.number()),
    }).index("by_email", ["email"]),

    sessions: defineTable({
        userId: v.id("users"),
        token: v.string(),
        expiresAt: v.number(),
    })
        .index("by_token", ["token"])
        .index("by_userId", ["userId"]),

    senderProfiles: defineTable({
        userId: v.id("users"),
        igUsername: v.string(),
    }).index("by_userId", ["userId"]),

    instagramAccounts: defineTable({
        userName: v.string(),
        fullName: v.string(),
        status: v.union(
            v.literal("available"),
            v.literal("assigned"),
            v.literal("sent"),
            v.literal("skip")
        ),
        message: v.optional(v.boolean()),
        senderProfileId: v.optional(v.id("senderProfiles")),
        assignmentDate: v.optional(v.string()),
        createdAt: v.string(),
    })
        .index("by_status", ["status"])
        .index("by_userName", ["userName"])
        .index("by_profile_date_status", [
            "senderProfileId",
            "assignmentDate",
            "status",
        ]),
});
