'use client';

import { useSession, getSessionToken } from '@/hooks/use-session';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useRouter } from 'next/navigation';
import { useEffect, useTransition, useState, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { UserRoleSelector } from './_components/user-role-selector';
import { UserAssignmentInput } from './_components/user-assignment-input';
import { AddUserDialog } from './_components/add-user-dialog';
import { UserNav } from '@/components/user-nav';
import { useToast } from '@/hooks/use-toast';
import type { AppUser } from '@/lib/types';
import {
  UserRoundCheck, Trash2, Upload, Users, FileSpreadsheet,
  Filter, CloudUpload, CheckCircle, Database, Send, Clock, Ban,
  BarChart3,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────
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

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, color, delay,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  delay: string;
}) {
  return (
    <div className={`animate-fade-in-up ${delay} group relative overflow-hidden rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value.toLocaleString()}</p>
        </div>
        <div className={`rounded-lg p-2 ${color} bg-current/10`}>
          <Icon className={`h-5 w-5 ${color} opacity-60`} />
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 h-0.5 w-full ${color.replace('text-', 'bg-')} opacity-40`} />
    </div>
  );
}

// ── Avatar Initials ────────────────────────────────────────────
function UserAvatar({ email }: { email: string }) {
  const initial = email.charAt(0).toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initial}
    </div>
  );
}

// ── Upload Tab Content ─────────────────────────────────────────
function UploadTabContent({ token }: { token: string }) {
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5" />
            Загрузка аккаунтов
          </CardTitle>
          <CardDescription>
            Загрузите CSV файл с аккаунтами Instagram. Женские аккаунты будут автоматически отфильтрованы.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div
              className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-all duration-200 ${dragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-muted-foreground/25 hover:border-primary/40 hover:bg-accent/30'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="rounded-2xl bg-muted/50 p-4">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium">Перетащите CSV файл сюда</p>
                <p className="text-sm text-muted-foreground">или нажмите кнопку ниже</p>
              </div>
              <Button
                variant="outline"
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
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{file?.name}</p>
                  <p className="text-sm text-muted-foreground">{preview.rowCount} строк</p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>Другой файл</Button>
              </div>
              <Separator />
              <div>
                <h3 className="mb-3 text-sm font-medium">Выберите поля для обработки:</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {preview.fields.map((field) => (
                    <label key={field} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm hover:bg-accent/50 cursor-pointer transition-colors">
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
                      <span className="truncate">{field}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="mb-2 text-sm font-medium">Пример данных:</h3>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        {preview.fields.map((f) => (
                          <th key={f} className="px-3 py-2 text-left font-medium whitespace-nowrap text-xs uppercase tracking-wider">{f}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {preview.fields.map((f) => (
                          <td key={f} className="px-3 py-2 whitespace-nowrap text-muted-foreground">{preview.sampleRow[f] || '-'}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <Button className="w-full sm:w-auto" onClick={handleProcess} disabled={selectedFields.size === 0}>
                <Filter className="h-4 w-4 mr-2" />
                Обработать и загрузить
              </Button>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-16">
              <CloudUpload className="h-12 w-12 text-primary animate-pulse" />
              <p className="text-lg font-medium">
                {uploadProgress > 0 ? 'Загрузка в Convex...' : 'Обработка файла...'}
              </p>
              {uploadProgress > 0 && (
                <div className="w-64">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="mt-1 text-sm text-center text-muted-foreground">{uploadProgress}%</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Results */}
          {step === 'results' && processResult && uploadResult && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="h-6 w-6" />
                <span className="text-lg font-semibold">Загрузка завершена!</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Всего строк', value: processResult.totalProcessed, color: 'text-foreground' },
                  { label: 'Отфильтровано', value: processResult.removed, color: 'text-red-500' },
                  { label: 'Добавлено', value: uploadResult.inserted, color: 'text-green-500' },
                  { label: 'Дубликаты', value: uploadResult.skipped, color: 'text-yellow-500' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border p-4 text-center">
                    <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <Button onClick={handleReset} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Загрузить ещё
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Admin Page ────────────────────────────────────────────
export default function AdminUsersPage() {
  const { user: session, isLoading, token } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const users = useQuery(api.users.getAllUsersWithRoles, token ? { sessionToken: token } : "skip");
  const stats = useQuery(api.instagramAccounts.getStats, token ? { sessionToken: token } : "skip");
  const deleteUserMutation = useMutation(api.users.deleteUser);
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleDeleteUser = (userId: string, email: string) => {
    const t = getSessionToken();
    if (!t) return;
    startDeleteTransition(async () => {
      try {
        await deleteUserMutation({ sessionToken: t, userId: userId as Id<"users"> });
        toast({ title: 'Пользователь удален', description: `${email} успешно удален.` });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Ошибка удаления', description: error.message });
      }
    });
  };

  useEffect(() => {
    if (!isLoading && !session) router.push('/login');
  }, [isLoading, session, router]);

  useEffect(() => {
    if (session && session.role !== 'admin') router.push('/');
  }, [session, router]);

  if (isLoading || !session || users === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 w-full max-w-5xl p-8">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (session.role !== 'admin') return null;

  const pageUser: AppUser = {
    id: session.id,
    email: session.email,
    username: session.email.split('@')[0],
    photoUrl: `https://placehold.co/40x40/212529/F8F9FA/png?text=${session.email.charAt(0).toUpperCase()}`,
    role: 'admin',
  };

  const statItems = stats ? [
    { label: 'Всего', value: stats.total, icon: Database, color: 'text-foreground', delay: 'stagger-1' },
    { label: 'Доступно', value: stats.available, icon: Clock, color: 'text-emerald-500', delay: 'stagger-2' },
    { label: 'Назначено', value: stats.assigned, icon: Users, color: 'text-blue-500', delay: 'stagger-3' },
    { label: 'Отправлено', value: stats.sent, icon: Send, color: 'text-violet-500', delay: 'stagger-4' },
    { label: 'Пропущено', value: stats.skipped, icon: Ban, color: 'text-muted-foreground', delay: 'stagger-5' },
  ] : [];

  const members = (users ?? []).filter(u => u.role === 'member');
  const admins = (users ?? []).filter(u => u.role === 'admin');
  const sortedUsers = [...admins, ...members];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center gap-4 px-4 md:px-6 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BarChart3 className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">Панель управления</span>
          </div>
          <div className="ml-auto">
            <UserNav user={pageUser} />
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 px-4 py-6 md:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Stats Strip */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {statItems.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="users" className="gap-1.5">
                <Users className="h-4 w-4" />
                Пользователи
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-1.5">
                <Upload className="h-4 w-4" />
                Загрузка CSV
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <AddUserDialog />
            </div>
          </div>

          {/* ── Users Tab ── */}
          <TabsContent value="users" className="space-y-4">
            <div className="animate-fade-in-up stagger-1">
              {/* Desktop Table */}
              <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-[280px]">Пользователь</TableHead>
                      <TableHead className="w-[140px]">Роль</TableHead>
                      <TableHead className="w-[140px]">Дневной лимит</TableHead>
                      <TableHead className="w-[110px] text-center">DM сегодня</TableHead>
                      <TableHead className="w-[110px] text-center">DM всего</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedUsers.map((u) => (
                      <TableRow key={u.id} className="group transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar email={u.email} />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{u.email}</p>
                              {u.id === session.id && (
                                <Badge variant="secondary" className="mt-0.5 text-[10px] px-1.5 py-0">вы</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <UserRoleSelector userId={u.id} currentRole={u.role} isCurrentUser={u.id === session.id} />
                        </TableCell>
                        <TableCell>
                          {u.role === 'member' ? (
                            <UserAssignmentInput userId={u.id} currentLimit={u.daily_assignments_limit} />
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {u.role === 'member' ? (
                            <span className="font-semibold tabular-nums">{u.sent_today_count}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {u.role === 'member' ? (
                            <span className="font-semibold tabular-nums">{u.sent_total_count}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.id !== session.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all" disabled={isDeleting}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Пользователь <span className="font-semibold text-foreground">{u.email}</span> будет удален навсегда.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteUser(u.id, u.email)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Удалить
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="grid gap-3 md:hidden">
                {sortedUsers.map((u) => (
                  <Card key={u.id} className="overflow-hidden">
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar email={u.email} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm">{u.email}</p>
                          {u.id === session.id && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">вы</Badge>}
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Роль</span>
                        <div className="w-1/2">
                          <UserRoleSelector userId={u.id} currentRole={u.role} isCurrentUser={u.id === session.id} />
                        </div>
                      </div>
                      {u.role === 'member' && (
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">Лимит</span>
                          <UserAssignmentInput userId={u.id} currentLimit={u.daily_assignments_limit} />
                        </div>
                      )}
                      {u.role === 'member' && (
                        <>
                          <Separator />
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="rounded-lg bg-muted/30 p-2">
                              <p className="text-lg font-bold tabular-nums">{u.sent_today_count}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">DM сегодня</p>
                            </div>
                            <div className="rounded-lg bg-muted/30 p-2">
                              <p className="text-lg font-bold tabular-nums">{u.sent_total_count}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">DM всего</p>
                            </div>
                          </div>
                        </>
                      )}
                      {u.id !== session.id && (
                        <>
                          <Separator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isDeleting}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Удалить
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Пользователь <span className="font-semibold text-foreground">{u.email}</span> будет удален навсегда.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(u.id, u.email)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── Upload Tab ── */}
          <TabsContent value="upload">
            <UploadTabContent token={token!} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
