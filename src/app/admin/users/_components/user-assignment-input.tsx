'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useTransition } from 'react';
import { Save } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { getSessionToken } from '@/hooks/use-session';
import type { Id } from '../../../../../convex/_generated/dataModel';

const formSchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(0, { message: 'Должно быть 0 или больше.' })
    .max(1000, { message: 'Не может превышать 1000.' }),
});

type UserAssignmentInputProps = {
  userId: string;
  currentLimit: number;
};

export function UserAssignmentInput({
  userId,
  currentLimit,
}: UserAssignmentInputProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const updateLimit = useMutation(api.users.updateUserAssignmentLimit);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      limit: currentLimit,
    },
  });

  const { isDirty } = form.formState;

  function onSubmit(values: z.infer<typeof formSchema>) {
    const token = getSessionToken();
    if (!token) return;

    startTransition(async () => {
      try {
        await updateLimit({
          sessionToken: token,
          userId: userId as Id<"users">,
          newLimit: values.limit,
        });
        toast({
          title: 'Лимит обновлен',
          description: `Лимит назначений сохранен.`,
        });
        form.reset({ limit: values.limit });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Ошибка обновления',
          description: error.message,
        });
        form.reset({ limit: currentLimit });
      }
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex items-start gap-2"
      >
        <FormField
          control={form.control}
          name="limit"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  className="h-9 w-24 text-center"
                />
              </FormControl>
              <FormMessage className="mt-1 text-xs" />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className="h-9 w-9"
          disabled={isPending || !isDirty}
        >
          <Save className="h-4 w-4" />
          <span className="sr-only">Сохранить</span>
        </Button>
      </form>
    </Form>
  );
}
