
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { LogOut, User as UserIcon, Shield, Moon, Sun, Laptop, Palette } from 'lucide-react';
import type { AppUser } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { getSessionToken, clearSessionToken } from '@/hooks/use-session';

type UserNavProps = {
  user: AppUser;
  customTrigger?: React.ReactNode;
};

export function UserNav({ user, customTrigger }: UserNavProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const signOut = useMutation(api.auth.signOut);

  const handleLogout = async () => {
    const token = getSessionToken();
    if (token) {
      try {
        await signOut({ token });
      } catch (e) {
        // Ignore errors during sign out
      }
    }
    clearSessionToken();
    router.push('/login');
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
        {customTrigger ? customTrigger : (
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.photoUrl} alt={`@${displayName}`} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-0 overflow-hidden border-muted-foreground/20 rounded-xl shadow-lg" align="end" forceMount>
        {/* Header Section */}
        <div className="flex flex-col space-y-1 p-4 bg-muted/40 border-b border-muted-foreground/10">
          <p className="text-sm font-semibold leading-none text-foreground">{displayName}</p>
          <p className="text-xs leading-none text-muted-foreground mt-1.5">
            {user.email}
          </p>
        </div>

        {/* Menu Items */}
        <div className="p-1">
          <DropdownMenuGroup>
            <div className="px-3 py-2 my-1">
              <div className="flex items-center p-1 rounded-full bg-muted/50 border border-muted-foreground/10">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 flex justify-center items-center py-1.5 rounded-full transition-all ${theme === 'light'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <Sun className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 flex justify-center items-center py-1.5 rounded-full transition-all ${theme === 'dark' || theme === 'system' // Default to dark if system
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <Moon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </DropdownMenuGroup>
        </div>

        <DropdownMenuSeparator className="m-0 bg-muted-foreground/10" />

        <div className="p-1">
          <DropdownMenuItem onClick={handleLogout} className="px-3 py-2.5 rounded-lg my-0.5 cursor-default hover:bg-accent focus:bg-accent transition-colors text-foreground">
            <LogOut className="mr-3 h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Выйти</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
