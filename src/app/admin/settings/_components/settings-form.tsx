'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { AppSettings } from '@/lib/types';
import { updateSettings } from '@/lib/supabase/admin';
import { useTransition } from 'react';

const formSchema = z.object({
  daily_assignments_per_member: z.coerce
    .number()
    .int()
    .min(1, { message: 'Must be at least 1.' })
    .max(100, { message: 'Cannot exceed 100.' }),
});

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      daily_assignments_per_member: settings.daily_assignments_per_member,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const { error } = await updateSettings({
        daily_assignments_per_member: values.daily_assignments_per_member,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: error.message,
        });
      } else {
        toast({
          title: 'Settings Saved',
          description: 'Your changes have been saved successfully.',
        });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="daily_assignments_per_member"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Daily Assignments</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 10"
                  {...field}
                  className="max-w-xs"
                />
              </FormControl>
              <FormDescription>
                The number of new Instagram accounts assigned to each member
                daily.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>
    </Form>
  );
}
