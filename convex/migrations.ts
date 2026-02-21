import { mutation } from "./_generated/server";

export const mergeKeywords = mutation({
    args: {},
    handler: async (ctx) => {
        const files = [
            "female_business_keywords.txt",
            "males_names.txt",
            "ukrainian_female_names.txt",
            "russian_female_names.txt"
        ];
        
        let allWords = new Set<string>();
        
        for (const file of files) {
            const doc = await ctx.db.query("keywords")
                .withIndex("by_filename", q => q.eq("filename", file))
                .first();
            if (doc && doc.content) {
                const words = doc.content.split("\n").map(w => w.trim()).filter(Boolean);
                words.forEach(w => allWords.add(w));
            }
        }
        
        const existing = await ctx.db.query("keywords")
            .withIndex("by_filename", q => q.eq("filename", "global_keywords.txt"))
            .first();
        
        const mergedContent = Array.from(allWords).join("\n");
        
        if (existing) {
            await ctx.db.patch(existing._id, { content: mergedContent });
        } else {
            await ctx.db.insert("keywords", { filename: "global_keywords.txt", content: mergedContent });
        }
        
        return "Merged " + allWords.size + " keywords.";
    }
});
