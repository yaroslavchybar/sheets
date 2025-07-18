
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
import { markTaskAsSubscribed } from '@/services/tasks';
import Link from 'next/link';

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
    // Optimistically remove from UI
    setTasks((prevTasks) =>
      prevTasks.filter((t) => t.assignmentId !== task.assignmentId)
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
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (tasks.length === 0) {
    return (
        <div className="p-4 text-center text-muted-foreground">
          No tasks assigned for today.
        </div>
      )
  }

  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden w-full rounded-md border md:block">
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
                            as subscribed and remove it from your list. This cannot be undone from the app.
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
                    <Button variant="link" size="sm" asChild>
                      <Link
                        href={task.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Profile
                      </Link>
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Mobile Card View */}
      <div className="space-y-2 md:hidden">
          {tasks.map((task) => (
            <div key={task.assignmentId} className="flex items-center gap-4 rounded-md border p-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Checkbox
                      id={`check-mobile-${task.assignmentId}`}
                      checked={task.isSubscribed}
                      disabled={task.isSubscribed}
                      aria-label={`Mark account ${task.userName} as subscribed`}
                      className="h-5 w-5"
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
                          as subscribed and remove it from your list. This cannot be undone from the app.
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
                <span className="flex-1 font-medium truncate">{task.userName}</span>
                <Button variant="link" size="sm" asChild>
                  <Link
                    href={task.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View
                  </Link>
                </Button>
            </div>
          ))}
      </div>
    </div>
  );
}
