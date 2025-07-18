'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User as UserIcon, Shield, Skeleton } from 'lucide-react';
import type { AppUser } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type UserNavProps = {
  user: {
    id: string;
    email: string;
    username?: string;
    photoUrl: string;
  };
};

export function UserNav({ user }: UserNavProps) {
  const router = useRouter();
  const [role, setRole] = useState<'admin' | 'member' | 'editor' | 'moderator' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      setRole(data?.role as any);
      setIsLoading(false);
    };

    if (user.id) {
      fetchUserRole();
    }
  }, [user.id]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  if (!user) {
    return null;
  }
  
  const displayName = user.username;
  const fallback = displayName?.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.photoUrl} alt={`@${displayName}`} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          {isLoading ? (
            <DropdownMenuItem disabled>
              <Skeleton className="mr-2 h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </DropdownMenuItem>
          ) : (
            role === 'admin' && (
             <Link href="/admin/users" passHref>
                <DropdownMenuItem>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>User Management</span>
                </DropdownMenuItem>
            </Link>
          )
        )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
