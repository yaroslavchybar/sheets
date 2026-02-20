import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get keywords by filename
export const get = query({
    args: { filename: v.string() },
    handler: async (ctx, args) => {
        const file = await ctx.db
            .query("keywords")
            .withIndex("by_filename", (q) => q.eq("filename", args.filename))
            .first();

        return file?.content ?? "";
    },
});

// Save keywords by filename, updating if it exists or inserting if not
export const save = mutation({
    args: { filename: v.string(), content: v.string() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("keywords")
            .withIndex("by_filename", (q) => q.eq("filename", args.filename))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { content: args.content });
        } else {
            await ctx.db.insert("keywords", {
                filename: args.filename,
                content: args.content,
            });
        }
    },
});
