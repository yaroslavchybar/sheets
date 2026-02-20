'use client';

import * as React from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { getSessionToken } from '@/hooks/use-session';
import type { SenderProfile } from '@/lib/types';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trash2, UserPlus, Check } from 'lucide-react';
import { useTransition } from 'react';

interface SenderProfileManagerProps {
    profiles: SenderProfile[];
    activeProfileId?: string;
    onSelectProfile: (id: string) => void;
    inDialog?: boolean;
}

export function SenderProfileManager({ profiles, activeProfileId, onSelectProfile, inDialog }: SenderProfileManagerProps) {
    const [newUsername, setNewUsername] = React.useState('');
    const [isAdding, startAddingTransition] = useTransition();
    const [isRemoving, startRemovingTransition] = useTransition();
    const { toast } = useToast();

    const addProfile = useMutation(api.senderProfiles.addProfile);
    const removeProfile = useMutation(api.senderProfiles.removeProfile);

    const handleAdd = () => {
        const token = getSessionToken();
        if (!token || !newUsername.trim()) return;

        const usernameFixed = newUsername.trim().replace(/^@/, '');

        startAddingTransition(async () => {
            try {
                const newId = await addProfile({ sessionToken: token, igUsername: usernameFixed });
                setNewUsername('');
                toast({ title: 'Профиль добавлен', description: `Аккаунт @${usernameFixed} успешно добавлен.` });
                if (!activeProfileId) {
                    onSelectProfile(newId);
                }
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Ошибка добавления', description: error.message });
            }
        });
    };

    const handleRemove = (profile: SenderProfile) => {
        const token = getSessionToken();
        if (!token) return;

        startRemovingTransition(async () => {
            try {
                await removeProfile({ sessionToken: token, profileId: profile._id as Id<"senderProfiles"> });
                toast({ title: 'Профиль удален', description: `Аккаунт @${profile.igUsername} удален.` });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Ошибка удаления', description: error.message });
            }
        });
    };

    const Content = (
        <div className="space-y-4 w-full">
            {/* List Profilies */}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {profiles.map((p) => (
                    <div
                        key={p._id}
                        className={`flex items-center justify-between rounded-md border p-3 cursor-pointer transition-colors ${activeProfileId === p._id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                        onClick={() => onSelectProfile(p._id)}
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${activeProfileId === p._id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                {activeProfileId === p._id ? <Check className="h-4 w-4" /> : <span className="text-xs uppercase">{p.igUsername.slice(0, 2)}</span>}
                            </div>
                            <span className="font-medium truncate">@{p.igUsername}</span>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleRemove(p); }}
                            disabled={isRemoving || isAdding}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Удалить</span>
                        </Button>
                    </div>
                ))}

                {profiles.length === 0 && (
                    <div className="col-span-full p-4 border border-dashed rounded-md text-center text-muted-foreground text-sm">
                        У вас еще нет добавленных профилей.
                    </div>
                )}
            </div>

            {/* Add new */}
            <div className="flex items-center gap-2 pt-2">
                <Input
                    placeholder="Имя пользователя IG (например, ivan_ivanov)"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    disabled={isAdding || isRemoving}
                />
                <Button onClick={handleAdd} disabled={!newUsername.trim() || isAdding || isRemoving}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Добавить
                </Button>
            </div>
        </div>
    );

    if (inDialog) {
        return Content;
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Профили отправителей</CardTitle>
                <CardDescription>
                    Добавьте ваши Instagram аккаунты, с которых вы отправляете сообщения. Выберите один из них, чтобы получить задачи.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {Content}
            </CardContent>
        </Card>
    );
}
