
'use client';

import * as React from 'react';
import type { InstagramAccount } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import Link from 'next/link';
import { useTransition } from 'react';
import { Download, XCircle } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { getSessionToken } from '@/hooks/use-session';
import type { Id } from '../../convex/_generated/dataModel';

interface SheetTableProps {
  tasks: InstagramAccount[];
}

export function SheetTable({ tasks: initialTasks }: SheetTableProps) {
  const [tasks, setTasks] = React.useState<InstagramAccount[]>(initialTasks);
  const [isClient, setIsClient] = React.useState(false);
  const [isPending, startTransition] = useTransition();
  const [isAssigning, startAssignmentTransition] = useTransition();
  const { toast } = useToast();

  const markSent = useMutation(api.instagramAccounts.markAsSent);
  const markSkipped = useMutation(api.instagramAccounts.markAsSkipped);
  const triggerAssign = useMutation(api.instagramAccounts.triggerAssignment);

  React.useEffect(() => {
    setIsClient(true);
    setTasks(initialTasks);
  }, [initialTasks]);

  const handleSentConfirm = (task: InstagramAccount) => {
    const token = getSessionToken();
    if (!token) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось определить текущего пользователя. Пожалуйста, обновите страницу.',
      });
      return;
    }

    const originalTasks = tasks;
    setTasks((prevTasks) => prevTasks.filter((t) => t.id !== task.id));

    startTransition(async () => {
      try {
        await markSent({
          sessionToken: token,
          instagramId: task.id as Id<"instagramAccounts">,
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Ошибка обновления',
          description: error.message,
        });
        setTasks(originalTasks);
      }
    });
  };

  const handleSkipConfirm = (task: InstagramAccount) => {
    const token = getSessionToken();
    if (!token) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось определить текущего пользователя. Пожалуйста, обновите страницу.',
      });
      return;
    }

    const originalTasks = tasks;
    setTasks((prevTasks) => prevTasks.filter((t) => t.id !== task.id));

    startTransition(async () => {
      try {
        await markSkipped({
          sessionToken: token,
          instagramId: task.id as Id<"instagramAccounts">,
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Ошибка пропуска',
          description: error.message,
        });
        setTasks(originalTasks);
      }
    });
  }

  const handleGetTasks = () => {
    const token = getSessionToken();
    if (!token) return;

    startAssignmentTransition(async () => {
      try {
        await triggerAssign({ sessionToken: token });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Ошибка назначения',
          description: error.message,
        });
      }
    });
  }

  if (!isClient) {
    return (
      <div className="w-full rounded-md border p-4">
        <div className="space-y-3">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground flex flex-col items-center gap-4">
        <p>На сегодня нет назначенных задач.</p>
        <Button onClick={handleGetTasks} disabled={isAssigning}>
          <Download className="mr-2" />
          {isAssigning ? 'Загрузка...' : 'Получить новые задачи'}
        </Button>
      </div>
    )
  }

  const tasksToShow = tasks.slice(0, 10);

  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden w-full rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">DM</TableHead>
              <TableHead>Имя пользователя</TableHead>
              <TableHead>Полное имя</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasksToShow.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Checkbox
                        id={`check-${task.id}`}
                        aria-label={`Отметить аккаунт ${task.userName} как отправленный`}
                        disabled={isPending}
                      />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Подтвердить отправку DM</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это отметит аккаунт{' '}
                          <span className="font-semibold text-foreground">
                            {task.userName}
                          </span>{' '}
                          как отправленный и удалит его из вашего списка. Это действие нельзя отменить из приложения.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleSentConfirm(task)}
                        >
                          Подтвердить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
                <TableCell className="font-medium">{task.userName}</TableCell>
                <TableCell>{task.fullName}</TableCell>
                <TableCell className="text-right">
                  <Button variant="link" size="sm" asChild>
                    <Link
                      href={task.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Посмотреть профиль
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <XCircle className="h-4 w-4 mr-1" />
                        Пропустить
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Пропустить этот аккаунт?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Аккаунт{' '}
                          <span className="font-semibold text-foreground">
                            {task.userName}
                          </span>{' '}
                          будет удален из вашего списка и больше не будет назначаться вам.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleSkipConfirm(task)}>
                          Да, пропустить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-2 md:hidden">
        {tasksToShow.map((task) => (
          <div key={task.id} className="flex flex-col items-start gap-4 rounded-md border p-4">
            <div className="flex w-full items-center gap-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Checkbox
                    id={`check-mobile-${task.id}`}
                    aria-label={`Отметить аккаунт ${task.userName} как отправленный`}
                    className="h-5 w-5"
                    disabled={isPending}
                  />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Подтвердить отправку DM</AlertDialogTitle>
                    <AlertDialogDescription>
                      Это отметит аккаунт{' '}
                      <span className="font-semibold text-foreground">
                        {task.userName}
                      </span>{' '}
                      как отправленный и удалит его из вашего списка. Это действие нельзя отменить из приложения.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleSentConfirm(task)}
                    >
                      Подтвердить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <span className="flex-1 font-medium truncate">{task.fullName || task.userName}</span>
              <Button variant="link" size="sm" asChild>
                <Link
                  href={task.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Посмотреть
                </Link>
              </Button>
            </div>
            <div className="w-full flex justify-center">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <XCircle className="h-4 w-4 mr-2" />
                    Пропустить
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Пропустить этот аккаунт?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Аккаунт{' '}
                      <span className="font-semibold text-foreground">
                        {task.userName}
                      </span>{' '}
                      будет удален из вашего списка и больше не будет назначаться вам.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleSkipConfirm(task)}>
                      Да, пропустить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
