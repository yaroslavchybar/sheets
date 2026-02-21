'use client';

import { useState, useCallback, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import {
    Upload, FileSpreadsheet, Filter, CloudUpload, CheckCircle
} from 'lucide-react';

interface PreviewData {
    fields: string[];
    sampleRow: Record<string, string>;
    rowCount: number;
}

interface ProcessResult {
    totalProcessed: number;
    removed: number;
    remaining: number;
    accounts: { userName: string; fullName: string }[];
}

interface UploadResult {
    inserted: number;
    skipped: number;
}

type UploadStep = 'upload' | 'preview' | 'processing' | 'results';

export function UploadTabContent({ token }: { token: string }) {
    const { toast } = useToast();
    const insertBatch = useMutation(api.instagramAccounts.insertBatch);

    const [step, setStep] = useState<UploadStep>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
    const [processResult, setProcessResult] = useState<ProcessResult | null>(null);
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
    const [isPending, startTransition] = useTransition();
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);

    const handleFileSelect = useCallback(async (selectedFile: File) => {
        if (!selectedFile.name.endsWith('.csv')) {
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Принимаются только CSV файлы.' });
            return;
        }
        setFile(selectedFile);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('action', 'preview');
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Preview failed'); }
            const data: PreviewData = await res.json();
            setPreview(data);
            const defaults = ['id', 'userName', 'username', 'user_name', 'fullName', 'full_name', 'name', 'User Name'];
            setSelectedFields(new Set(data.fields.filter((f: string) => defaults.includes(f))));
            setStep('preview');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
        }
    }, [toast]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) handleFileSelect(droppedFile);
    }, [handleFileSelect]);

    const handleProcess = useCallback(async () => {
        if (!file) return;
        const t = token;
        if (!t) return;
        setStep('processing');
        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('action', 'process');
                formData.append('keepFields', JSON.stringify([...selectedFields]));
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Processing failed'); }
                const result: ProcessResult = await res.json();
                setProcessResult(result);

                const BATCH_SIZE = 100;
                let totalInserted = 0;
                let totalSkipped = 0;
                const accounts = result.accounts;
                for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
                    const batch = accounts.slice(i, i + BATCH_SIZE);
                    const batchAccounts = batch.map((a) => ({ userName: a.userName, fullName: a.fullName, status: 'available' }));
                    const batchResult = await insertBatch({ sessionToken: t, accounts: batchAccounts });
                    totalInserted += batchResult.inserted;
                    totalSkipped += batchResult.skipped;
                    setUploadProgress(Math.min(100, Math.round(((i + batch.length) / accounts.length) * 100)));
                }
                setUploadResult({ inserted: totalInserted, skipped: totalSkipped });
                setStep('results');
                toast({ title: 'Загрузка завершена', description: `Добавлено ${totalInserted}, дубликатов ${totalSkipped}` });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
                setStep('preview');
            }
        });
    }, [file, selectedFields, insertBatch, toast, token]);

    const handleReset = () => {
        setStep('upload'); setFile(null); setPreview(null);
        setSelectedFields(new Set()); setProcessResult(null);
        setUploadResult(null); setUploadProgress(0);
    };

    return (
        <div className="animate-fade-in-up stagger-2">
            <Card className="border-muted shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                    {/* Step 1: Upload */}
                    {step === 'upload' && (
                        <div
                            className={`flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed p-14 transition-all duration-300 ${dragOver ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/40'}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                        >
                            <div className="rounded-full bg-primary/10 p-5 shadow-sm">
                                <FileSpreadsheet className="h-12 w-12 text-primary" />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-xl font-semibold">Перетащите CSV файл сюда</p>
                                <p className="text-sm text-muted-foreground">Поддерживается кодировка UTF-8</p>
                            </div>
                            <Button
                                variant="outline"
                                className="mt-2 rounded-full px-8 shadow-sm hover:shadow"
                                onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file'; input.accept = '.csv';
                                    input.onchange = (e) => {
                                        const f = (e.target as HTMLInputElement).files?.[0];
                                        if (f) handleFileSelect(f);
                                    };
                                    input.click();
                                }}
                            >
                                Выбрать файл
                            </Button>
                        </div>
                    )}

                    {/* Step 2: Preview */}
                    {step === 'preview' && preview && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between rounded-xl bg-accent/40 p-4 border border-accent">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-background rounded-lg shadow-sm border">
                                        <FileSpreadsheet className="h-6 w-6 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">{file?.name}</p>
                                        <p className="text-xs text-muted-foreground">{preview.rowCount.toLocaleString()} строк найдено</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={handleReset} className="hover:bg-background">Другой файл</Button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-1 rounded-full bg-primary" />
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Поля для обработки</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                    {preview.fields.map((field) => (
                                        <label key={field} className="flex items-center gap-2.5 rounded-xl border p-3 text-sm hover:bg-accent/50 cursor-pointer transition-colors shadow-sm bg-card">
                                            <Checkbox
                                                checked={selectedFields.has(field)}
                                                onCheckedChange={(checked) => {
                                                    setSelectedFields((prev) => {
                                                        const next = new Set(prev);
                                                        if (checked) next.add(field); else next.delete(field);
                                                        return next;
                                                    });
                                                }}
                                            />
                                            <span className="truncate font-medium">{field}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-1 rounded-full bg-muted-foreground" />
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Превью данных (1 строка)</h3>
                                </div>
                                <div className="overflow-x-auto rounded-xl border shadow-sm">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                {preview.fields.map((f) => (
                                                    <th key={f} className="px-4 py-3 text-left font-semibold whitespace-nowrap text-xs text-muted-foreground">{f}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-card">
                                            <tr className="hover:bg-accent/30 transition-colors">
                                                {preview.fields.map((f) => (
                                                    <td key={f} className="px-4 py-3 whitespace-nowrap text-foreground/80 font-medium">{preview.sampleRow[f] || '-'}</td>
                                                ))}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end">
                                <Button size="lg" className="w-full sm:w-auto px-8 rounded-full shadow-md" onClick={handleProcess} disabled={selectedFields.size === 0}>
                                    <Filter className="h-4 w-4 mr-2" />
                                    Начать обработку
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Processing */}
                    {step === 'processing' && (
                        <div className="flex flex-col items-center justify-center gap-6 py-20">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                                <div className="relative rounded-full bg-primary/10 p-6">
                                    <CloudUpload className="h-16 w-16 text-primary animate-bounce" />
                                </div>
                            </div>

                            <div className="text-center space-y-2">
                                <p className="text-xl font-bold">
                                    {uploadProgress > 0 ? 'Загрузка в базу...' : 'Фильтрация аккаунтов...'}
                                </p>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                    Пожалуйста, не закрывайте вкладку, процесс может занять несколько минут.
                                </p>
                            </div>

                            {uploadProgress > 0 && (
                                <div className="w-full max-w-sm mt-4">
                                    <div className="flex justify-between mb-2 text-sm font-medium">
                                        <span>Прогресс</span>
                                        <span className="text-primary">{uploadProgress}%</span>
                                    </div>
                                    <div className="h-3 rounded-full bg-muted overflow-hidden shadow-inner">
                                        <div className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300 relative overflow-hidden" style={{ width: `${uploadProgress}%` }}>
                                            <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Results */}
                    {step === 'results' && processResult && uploadResult && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="flex flex-col items-center text-center space-y-3 pb-4">
                                <div className="rounded-full bg-green-500/10 p-4">
                                    <CheckCircle className="h-12 w-12 text-green-500" />
                                </div>
                                <h2 className="text-2xl font-bold text-foreground">Загрузка успешно завершена!</h2>
                                <p className="text-muted-foreground w-full max-w-md">Все данные были обработаны, профили отфильтрованы и добавлены в базу.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                                {[
                                    { label: 'Всего строк в файле', value: processResult.totalProcessed, color: 'text-foreground', bg: 'bg-muted/30' },
                                    { label: 'Отсеяно фильтром', value: processResult.removed, color: 'text-red-500', bg: 'bg-red-500/5' },
                                    { label: 'Новых в базу', value: uploadResult.inserted, color: 'text-green-500', bg: 'bg-green-500/5' },
                                    { label: 'Дубликаты (пропущено)', value: uploadResult.skipped, color: 'text-amber-500', bg: 'bg-amber-500/5' },
                                ].map((s) => (
                                    <div key={s.label} className={`rounded-2xl border p-5 text-center shadow-sm ${s.bg}`}>
                                        <p className={`text-3xl font-black tabular-nums tracking-tight ${s.color}`}>{s.value.toLocaleString()}</p>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-2">{s.label}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-center pt-4">
                                <Button onClick={handleReset} variant="outline" size="lg" className="rounded-full px-8 shadow-sm">
                                    <Upload className="h-4 w-4 mr-2" />
                                    Загрузить новый файл
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
