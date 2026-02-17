
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
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useState, useTransition } from 'react';
import { UserPlus } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { getSessionToken } from '@/hooks/use-session';

const formSchema = z.object({
  email: z.string().email({ message: 'Пожалуйста, введите действительный email.' }),
  password: z
    .string()
    .min(6, { message: 'Пароль должен содержать не менее 6 символов.' }),
  role: z.enum(['admin', 'member'], {
    required_error: 'Вам нужно выбрать роль.',
  }),
});

export function AddUserDialog() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const createUserMutation = useMutation(api.users.createUser);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'member',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const token = getSessionToken();
    if (!token) return;

    startTransition(async () => {
      try {
        await createUserMutation({
          sessionToken: token,
          email: values.email,
          password: values.password,
          role: values.role,
        });
        toast({
          title: 'Пользователь создан',
          description: `Пользователь ${values.email} успешно создан.`,
        });
        form.reset();
        setIsOpen(false);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Ошибка создания',
          description: error.message,
        });
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2" />
          Добавить пользователя
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Создать нового пользователя</DialogTitle>
          <DialogDescription>
            Введите данные для нового пользователя. Он сможет изменить свой пароль позже.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id="add-user-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="user@example.com" {...field} />
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
                  <FormLabel>Пароль</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Роль</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите роль" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="member">Участник</SelectItem>
                      <SelectItem value="admin">Админ</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>
              Отмена
            </Button>
          </DialogClose>
          <Button type="submit" form="add-user-form" disabled={isPending}>
            {isPending ? 'Создание...' : 'Создать пользователя'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
