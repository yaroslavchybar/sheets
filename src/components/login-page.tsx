
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "lucide-react";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
    } else {
        router.refresh();
    }
    setIsLoading(false);
  };
  
  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
       toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Check your email",
        description: "A confirmation link has been sent to your email address.",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
       <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sheet className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">SheetFlow</CardTitle>
          <CardDescription>
            Sign in or create an account to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
                <form onSubmit={handleLogin} className="grid gap-4 pt-4">
                    <div className="grid gap-2">
                    <Label htmlFor="email-signin">Email</Label>
                    <Input
                        id="email-signin"
                        type="email"
                        placeholder="m@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                    />
                    </div>
                    <div className="grid gap-2">
                    <Label htmlFor="password-signin">Password</Label>
                    <Input
                        id="password-signin"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                    />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                    </Button>
                </form>
            </TabsContent>
            <TabsContent value="signup">
               <form onSubmit={handleSignUp} className="grid gap-4 pt-4">
                    <div className="grid gap-2">
                    <Label htmlFor="email-signup">Email</Label>
                    <Input
                        id="email-signup"
                        type="email"
                        placeholder="m@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                    />
                    </div>
                    <div className="grid gap-2">
                    <Label htmlFor="password-signup">Password</Label>
                    <Input
                        id="password-signup"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                    />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign Up
                    </Button>
                </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
