"use client";

import * as React from "react";
import type { Task, User } from "@/lib/types";
import { getTasks, updateTaskStatus } from "@/services/google-sheets";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";

interface SheetTableProps {
  user: User;
}

export function SheetTable({ user }: SheetTableProps) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      const fetchedTasks = await getTasks();
      setTasks(fetchedTasks);
      setIsLoading(false);
    };
    fetchTasks();
  }, []);

  const handleStatusChange = async (taskId: string, newStatus: Task["status"]) => {
    const originalTasks = [...tasks];
    const taskToUpdate = tasks.find((task) => task.id === taskId);
    
    if (!taskToUpdate || !taskToUpdate.rowNumber) return;

    // Optimistically update UI
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );

    const success = await updateTaskStatus(taskToUpdate.rowNumber, newStatus);
    
    if (!success) {
      // Revert on failure
      setTasks(originalTasks);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update the task status in Google Sheets.",
      });
    }
  };

  const handleCheckboxChange = (taskId: string, checked: boolean) => {
    const newStatus = checked ? "Done" : "In Progress";
    handleStatusChange(taskId, newStatus);
  };
  
  const getStatusBadgeVariant = (status: Task["status"]) => {
    if (status === "Done") return "default";
    if (status === "In Progress") return "secondary";
    return "outline";
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Task</TableHead>
            <TableHead className="w-[150px]">Assignee</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead className="w-[150px] text-right">Due Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const isOwner = user.role === 'admin' || user.name === task.assignee.name;
            return (
              <TableRow key={task.id} className={cn(!isOwner && "text-muted-foreground/70")}>
                <TableCell>
                  <Checkbox
                    id={`check-${task.id}`}
                    checked={task.status === "Done"}
                    onCheckedChange={(checked) => handleCheckboxChange(task.id, !!checked)}
                    disabled={!isOwner}
                    aria-label={`Mark task ${task.task} as done`}
                  />
                </TableCell>
                <TableCell className="font-medium">{task.task}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
                      <AvatarFallback>{task.assignee.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{task.assignee.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                    {isOwner ? (
                        <Select
                            value={task.status}
                            onValueChange={(value: Task["status"]) => handleStatusChange(task.id, value)}
                            disabled={!isOwner}
                        >
                            <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="To Do">To Do</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Done">Done</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <Badge variant={getStatusBadgeVariant(task.status)} className="pointer-events-none">
                            {task.status}
                        </Badge>
                    )}
                </TableCell>
                <TableCell className="text-right">{format(parseISO(task.dueDate), 'MMM d, yyyy')}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
