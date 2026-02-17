"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

function getSessionToken(): string {
    if (typeof document === "undefined") return "";
    const match = document.cookie.match(/(?:^|;\s*)session_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : "";
}

export function setSessionToken(token: string) {
    document.cookie = `session_token=${encodeURIComponent(token)}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
}

export function clearSessionToken() {
    document.cookie = "session_token=; path=/; max-age=0";
}

export function useSession() {
    const token = getSessionToken();
    const session = useQuery(api.auth.getSession, token ? { token } : "skip");

    return {
        token,
        user: session ?? null,
        isLoading: session === undefined && !!token,
        isAuthenticated: !!session,
    };
}

export { getSessionToken };
