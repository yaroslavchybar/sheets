
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Sheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters long.' }),
});

type LoginFormProps = {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  buttonText: string;
  isLoading: boolean;
  form: any;
};

const LoginForm = ({
  onSubmit,
  buttonText,
  isLoading,
  form,
}: LoginFormProps) => (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="email">Email</Label>
            <FormControl>
              <Input
                id="email"
                placeholder="you@example.com"
                type="email"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="password">Password</Label>
            <FormControl>
              <Input
                id="password"
                placeholder="••••••••"
                type="password"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Processing...' : buttonText}
      </Button>
    </form>
  </Form>
);

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function handleSignIn(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: error.message,
      });
    } else {
      toast({
        title: 'Signed In',
        description: "You've been successfully signed in.",
      });
      router.push('/');
      router.refresh();
    }
    setIsLoading(false);
  }

  async function handleSignUp(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error.message,
      });
    } else {
      toast({
        title: 'Check your email',
        description:
          "We've sent you a confirmation link to verify your email address.",
      });
      form.reset();
    }
    setIsLoading(false);
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <Tabs defaultValue="signin" className="w-full max-w-sm">
        <Card>
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="pt-4">
              <LoginForm
                onSubmit={handleSignIn}
                buttonText="Sign In"
                isLoading={isLoading}
                form={form}
              />
            </TabsContent>
            <TabsContent value="signup" className="pt-4">
              <LoginForm
                onSubmit={handleSignUp}
                buttonText="Sign Up"
                isLoading={isLoading}
                form={form}
              />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
