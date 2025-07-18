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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { updateSubscriptionStatus } from '@/services/google-sheets';
import Link from 'next/link';

interface SheetTableProps {
  tasks: InstagramAccount[];
}

export function SheetTable({ tasks: initialTasks }: SheetTableProps) {
  const [tasks, setTasks] = React.useState<InstagramAccount[]>(initialTasks);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    // We already have tasks from server props, just need to set loading to false.
    setTasks(initialTasks);
    setIsLoading(false);
  }, [initialTasks]);

  const handleCheckboxChange = async (
    rowNumber: number,
    checked: boolean
  ) => {
    // Optimistically update the UI
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.rowNumber === rowNumber ? { ...task, isSubscribed: checked } : task
      )
    );

    const success = await updateSubscriptionStatus(rowNumber, checked);

    if (!success) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the sheet. Please try again.',
      });
      // Revert the change if the API call fails
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.rowNumber === rowNumber
            ? { ...task, isSubsquared: !checked }
            : task
        )
      );
    }
  };

  if (isLoading) {
    return (
      <div className="w-full rounded-md border p-4">
        <div className="space-y-3">
          <Skeleton className="h-5 w-2/5" />
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
              <TableHead className="text-right">Profile</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <Checkbox
                    id={`check-${task.rowNumber}`}
                    checked={task.isSubscribed}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(task.rowNumber, !!checked)
                    }
                    aria-label={`Mark account ${task.userName} as subscribed`}
                  />
                </TableCell>
                <TableCell className="font-medium">{task.userName}</TableCell>
                <TableCell>{task.fullName}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={task.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
