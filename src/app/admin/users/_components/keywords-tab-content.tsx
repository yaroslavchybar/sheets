'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, X, Play, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { ScrollArea } from "@/components/ui/scroll-area";

const GLOBAL_FILE = 'us_male_names.txt';

export function KeywordsTabContent() {
    const { toast } = useToast();
    const [inputValue, setInputValue] = useState('');
    const [keywords, setKeywords] = useState<string[]>([]);
    const [isFiltering, setIsFiltering] = useState(false);

    // Fetch data
    const data = useQuery(api.keywords.get, { filename: GLOBAL_FILE });
    const saveToConvex = useMutation(api.keywords.save);
    const removeByKeyword = useMutation(api.instagramAccounts.removeByKeyword);
    const runFullFiltration = useMutation(api.instagramAccounts.runFullFiltration);

    useEffect(() => {
        if (data !== undefined) {
            setKeywords(Array.from(new Set(data.split('\n').map(t => t.trim()).filter(Boolean))));
        }
    }, [data]);

    const matches = useMemo(() => {
        if (!inputValue.trim()) return [];
        const lowerInput = inputValue.toLowerCase();
        return keywords.filter(k => k.toLowerCase().startsWith(lowerInput)).slice(0, 100);
    }, [inputValue, keywords]);

    const handleAdd = () => {
        const newWord = inputValue.trim();
        if (!newWord) return;

        if (keywords.some(k => k === newWord)) {
            toast({ title: 'Уже существует', description: 'Это слово уже есть в списке' });
            return;
        }

        const newKeywords = [...keywords, newWord];
        setKeywords(newKeywords);
        setInputValue('');

        saveToConvex({ filename: GLOBAL_FILE, content: newKeywords.join('\n') })
            .then(async () => {
                toast({ title: 'Добавлено', description: `Слово "${newWord}" добавлено` });

                // Trigger background filter for live accounts
                try {
                    const removedCount = await removeByKeyword({ keyword: newWord });
                    if (removedCount > 0) {
                        toast({
                            title: 'Аккаунты отфильтрованы',
                            description: `Удалено ${removedCount} аккаунтов, содержащих "${newWord}"`
                        });
                    }
                } catch (e) {
                    console.error("Failed to filter accounts", e);
                }
            })
            .catch((e) => toast({ variant: 'destructive', title: 'Ошибка', description: e.message || 'Не удалось сохранить' }));
    };

    const handleDelete = (wordToDelete: string) => {
        const newKeywords = keywords.filter(k => k !== wordToDelete);
        setKeywords(newKeywords);

        saveToConvex({ filename: GLOBAL_FILE, content: newKeywords.join('\n') })
            .then(() => toast({ title: 'Удалено', description: `Слово "${wordToDelete}" удалено` }))
            .catch((e) => toast({ variant: 'destructive', title: 'Ошибка', description: e.message || 'Не удалось удалить' }));
    };

    const handleRunFiltration = async () => {
        try {
            setIsFiltering(true);
            const removedCount = await runFullFiltration();
            toast({
                title: 'Фильтрация завершена',
                description: `Было удалено ${removedCount} нецелевых профилей.`,
            });
        } catch (error: any) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось запустить фильтрацию',
                variant: 'destructive',
            });
        } finally {
            setIsFiltering(false);
        }
    };

    return (
        <div className="animate-fade-in-up stagger-2">
            <Card>
                <CardContent className="space-y-4 pt-6">

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAdd();
                                }}
                                placeholder="Поиск слова или добавление нового..."
                                className="pl-9 focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                        </div>
                        <Button onClick={handleAdd} disabled={!inputValue.trim()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Добавить
                        </Button>
                        <Button
                            onClick={handleRunFiltration}
                            disabled={isFiltering}
                            variant="outline"
                            className="gap-2"
                        >
                            {isFiltering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                            Запустить фильтрацию
                        </Button>
                    </div>

                    {inputValue.trim() && (
                        <Card className="mt-2 border border-muted bg-card">
                            {matches.length > 0 ? (
                                <ScrollArea className="h-72 w-full rounded-md">
                                    <div className="p-4 space-y-2">
                                        <div className="text-sm text-muted-foreground mb-4">
                                            Найдено {matches.length} совпадений
                                        </div>
                                        {matches.map((match, i) => (
                                            <div key={i} className="flex items-center justify-between group rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors">
                                                <span className="font-medium">{match}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleDelete(match)}
                                                >
                                                    <X className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="p-8 text-center text-muted-foreground">
                                    Слово "{inputValue}" не найдено в словаре. Нажмите "Добавить", чтобы внести его.
                                </div>
                            )}
                        </Card>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
