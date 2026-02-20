import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run at 22:00 UTC every day, which is 00:00 in Kyiv standard time (or 01:00 AM during DST).
crons.daily(
    "reset-unassigned-accounts-kyiv-midnight",
    { hourUTC: 22, minuteUTC: 0 },
    internal.instagramAccounts.resetUnassignedTasks
);

crons.daily(
    "reset-user-daily-stats-kyiv-midnight",
    { hourUTC: 22, minuteUTC: 0 },
    internal.instagramAccounts.resetUserDailyStats
);

export default crons;
