
'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateUserRole } from '@/lib/supabase/admin';
import { useToast } from '@/hooks/use-toast';
import { useTransition } from 'react';
import type { UserRole } from '@/lib/types';

type UserRoleSelectorProps = {
  userId: string;
  currentRole: UserRole;
  isCurrentUser: boolean;
};

export function UserRoleSelector({
  userId,
  currentRole,
  isCurrentUser,
}: UserRoleSelectorProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (newRole: UserRole) => {
    startTransition(async () => {
      const { error } = await updateUserRole(userId, newRole);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: error.message,
        });
      } else {
        toast({
          title: 'Role Updated',
          description: `User role has been successfully changed to ${newRole}.`,
        });
      }
    });
  };

  return (
    <Select
      defaultValue={currentRole}
      onValueChange={handleRoleChange}
      disabled={isCurrentUser || isPending}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="member">Member</SelectItem>
      </SelectContent>
    </Select>
  );
}
