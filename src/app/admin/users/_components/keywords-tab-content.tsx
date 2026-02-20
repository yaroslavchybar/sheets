'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TagsInput } from '@/components/ui/tags-input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, FileText, RefreshCw } from 'lucide-react';
import { getKeywords, saveKeywords } from '../actions';

const FILES = [
    { id: 'female_business_keywords.txt', label: 'Female Business Keywords' },
    { id: 'males_names.txt', label: 'Male Names Exceptions' },
    { id: 'ukrainian_female_names.txt', label: 'Ukrainian Female Names' },
    { id: 'russian_female_names.txt', label: 'Russian Female Names' },
];

export function KeywordsTabContent() {
    const { toast } = useToast();
    const [selectedFile, setSelectedFile] = useState(FILES[0].id);
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPending, startTransition] = useTransition();

    const loadFile = async (filename: string) => {
        setIsLoading(true);
        try {
            const data = await getKeywords(filename);
            setContent(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить файл' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadFile(selectedFile);
    }, [selectedFile]);

    const handleSave = () => {
        startTransition(async () => {
            const result = await saveKeywords(selectedFile, content);
            if (result.success) {
                toast({ title: 'Сохранено', description: 'Файл успешно обновлен' });
            } else {
                toast({ variant: 'destructive', title: 'Ошибка', description: result.error || 'Не удалось сохранить файл' });
            }
        });
    };

    return (
        <div className="animate-fade-in-up stagger-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5" />
                        Управление ключевыми словами
                    </CardTitle>
                    <CardDescription>
                        Редактируйте списки имен и ключевых слов для фильтрации аккаунтов. Каждое слово с новой строки.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {FILES.map((f) => (
                            <Button
                                key={f.id}
                                variant={selectedFile === f.id ? 'default' : 'outline'}
                                onClick={() => setSelectedFile(f.id)}
                                className="text-sm"
                            >
                                {f.label}
                            </Button>
                        ))}
                    </div>

                    <div className="relative">
                        {isLoading ? (
                            <div className="flex h-[400px] items-center justify-center rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <TagsInput
                                value={Array.from(new Set(content.split('\n').map(t => t.trim()).filter(Boolean)))}
                                onValueChange={(tags) => setContent(tags.join('\n'))}
                                className="h-[400px]"
                                placeholder="Добавьте слово и нажмите Enter..."
                            />
                        )}
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => loadFile(selectedFile)}
                            disabled={isLoading || isPending}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Сбросить
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isLoading || isPending}
                        >
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Сохранить
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
