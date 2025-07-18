"use client";

import * as React from "react";
import type { Task, User } from "@/lib/types";
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

interface SheetTableProps {
  data: Task[];
  user: User;
}

export function SheetTable({ data, user }: SheetTableProps) {
  const [tasks, setTasks] = React.useState<Task[]>(data);

  const handleStatusChange = (taskId: string, status: Task["status"]) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, status } : task
      )
    );
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
