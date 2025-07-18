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
import { markTaskAsDeleted, markTaskAsSubscribed } from '@/services/tasks';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';

interface SheetTableProps {
  tasks: InstagramAccount[];
}

export function SheetTable({ tasks: initialTasks }: SheetTableProps) {
  const [tasks, setTasks] = React.useState<InstagramAccount[]>(initialTasks);
  const [isClient, setIsClient] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setIsClient(true);
    setTasks(initialTasks);
  }, [initialTasks]);

  const handleSubscriptionConfirm = async (task: InstagramAccount) => {
    // Optimistically update the UI
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.assignmentId === task.assignmentId ? { ...t, isSubscribed: true } : t
      )
    );

    const { error } = await markTaskAsSubscribed(
      task.assignmentId,
      task.rowNumber,
      true
    );

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message,
      });
      // Revert the change if the API call fails
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.assignmentId === task.assignmentId
            ? { ...t, isSubscribed: false }
            : t
        )
      );
    }
  };

  const handleDeleteConfirm = async (task: InstagramAccount) => {
    // Optimistically remove from UI
    setTasks((prevTasks) =>
      prevTasks.filter((t) => t.assignmentId !== task.assignmentId)
    );

    const { error } = await markTaskAsDeleted(task.assignmentId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message,
      });
      // Revert if the API call fails
      setTasks(initialTasks);
    }
  };

  if (!isClient) {
    return (
      <div className="w-full rounded-md border p-4">
        <div className="space-y-3">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-md border">
      {tasks.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">
          No tasks assigned for today.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Subscribed</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.assignmentId}>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Checkbox
                        id={`check-${task.assignmentId}`}
                        checked={task.isSubscribed}
                        disabled={task.isSubscribed}
                        aria-label={`Mark account ${task.userName} as subscribed`}
                      />
                    </AlertDialogTrigger>
                    {!task.isSubscribed && (
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Subscription</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will mark the account{' '}
                            <span className="font-semibold text-foreground">
                              {task.userName}
                            </span>{' '}
                            as subscribed. This cannot be undone from the app.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleSubscriptionConfirm(task)}
                          >
                            Confirm
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    )}
                  </AlertDialog>
                </TableCell>
                <TableCell className="font-medium">{task.userName}</TableCell>
                <TableCell>{task.fullName}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="link" size="sm" asChild>
                      <Link
                        href={task.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Profile
                      </Link>
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete Task</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the account{' '}
                            <span className="font-semibold text-foreground">
                              {task.userName}
                            </span>{' '}
                            from your daily list. You cannot undo this action.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDeleteConfirm(task)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
