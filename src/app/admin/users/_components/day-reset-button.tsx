
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
          title: 'Reset Failed',
          description: error.message,
        });
      } else {
        toast({
          title: 'Day Reset Successful',
          description: 'All pending tasks have been returned to the assignment pool.',
        });
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <RefreshCcw className="mr-2" />
          Trigger Day Reset
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will immediately delete all pending (unsubscribed) tasks for all members. This cannot be undone. All cleared tasks will return to the assignment pool.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleReset} disabled={isPending}>
            {isPending ? 'Resetting...' : 'Yes, reset the day'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
