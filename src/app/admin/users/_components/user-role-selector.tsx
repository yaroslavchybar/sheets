
'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTransition } from 'react';
import type { UserRole } from '@/lib/types';
import { useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { getSessionToken } from '@/hooks/use-session';
import type { Id } from '../../../../../convex/_generated/dataModel';

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
  const updateRole = useMutation(api.users.updateUserRole);

  const handleRoleChange = (newRole: UserRole) => {
    const token = getSessionToken();
    if (!token) return;

    startTransition(async () => {
      try {
        await updateRole({
          sessionToken: token,
          userId: userId as Id<"users">,
          role: newRole,
        });
        toast({
          title: 'Роль обновлена',
          description: `Роль пользователя успешно изменена на ${newRole}.`,
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Ошибка обновления',
          description: error.message,
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
        <SelectValue placeholder="Выберите роль" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">Админ</SelectItem>
        <SelectItem value="member">Участник</SelectItem>
      </SelectContent>
    </Select>
  );
}
