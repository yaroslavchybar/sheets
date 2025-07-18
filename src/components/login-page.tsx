"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sheet className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">SheetFlow</CardTitle>
          <CardDescription>
            Sign in with a demo role to access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
           <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => login('member')}>
              Log in as Member
            </Button>
            <Button variant="secondary" onClick={() => login('admin')}>
              Log in as Admin
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
