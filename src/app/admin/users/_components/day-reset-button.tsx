
'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { triggerDayReset } from '@/lib/supabase/admin';
import { RefreshCcw } from 'lucide-react';

export function DayResetButton() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleReset = () => {
    startTransition(async () => {
      const { error } = await triggerDayReset();

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Ошибка сброса',
          description: error.message,
        });
      } else {
        toast({
          title: 'Сброс дня успешен',
          description: 'Все ожидающие задачи возвращены в пул назначений.',
        });
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <RefreshCcw className="mr-2" />
          Сбросить день
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Вы абсолютно уверены?</AlertDialogTitle>
          <AlertDialogDescription>
            Это действие немедленно удалит все ожидающие (неподписанные) задачи для всех участников. Это действие нельзя отменить. Все очищенные задачи вернутся в пул назначений.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={handleReset} disabled={isPending}>
            {isPending ? 'Сброс...' : 'Да, сбросить день'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
