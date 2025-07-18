"use client";

import { useAuth } from "@/hooks/use-auth";
import LoginPage from "@/components/login-page";
import Dashboard from "@/components/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

export default function Home() {
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <LoginPage />;
}
