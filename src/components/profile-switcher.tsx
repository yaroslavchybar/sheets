'use client';

import * as React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import type { SenderProfile } from '@/lib/types';
import { SenderProfileManager } from '@/components/sender-profile-manager';

interface ProfileSwitcherProps {
    profiles: SenderProfile[];
    activeProfileId?: string;
    onSelectProfile: (id: string) => void;
}

export function ProfileSwitcher({
    profiles,
    activeProfileId,
    onSelectProfile,
}: ProfileSwitcherProps) {
    const [isManagerOpen, setIsManagerOpen] = React.useState(false);

    return (
        <div className="flex items-center gap-2">
            <Select
                value={activeProfileId || 'unselected'}
                onValueChange={(val) => {
                    if (val && val !== 'unselected') {
                        onSelectProfile(val);
                    }
                }}
            >
                <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Выберите профиль..." />
                </SelectTrigger>
                <SelectContent>
                    {profiles.length === 0 ? (
                        <SelectItem value="unselected" disabled>
                            Нет профилей
                        </SelectItem>
                    ) : (
                        profiles.map((p) => (
                            <SelectItem key={p._id} value={p._id}>
                                @{p.igUsername}
                            </SelectItem>
                        ))
                    )}
                </SelectContent>
            </Select>

            <Dialog open={isManagerOpen} onOpenChange={setIsManagerOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Settings2 className="h-4 w-4" />
                        <span className="sr-only">Управление профилями</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Управление профилями</DialogTitle>
                        <DialogDescription>
                            Настройте список Instagram аккаунтов, с которых вы будете отправлять сообщения.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <SenderProfileManager
                            profiles={profiles}
                            activeProfileId={activeProfileId}
                            onSelectProfile={onSelectProfile}
                            inDialog={true}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
