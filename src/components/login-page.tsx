'use client';

import Script from 'next/script';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet } from 'lucide-react';
import { createSession } from '@/app/actions';
import type { TelegramUser } from '@/lib/types';
import { useEffect } from 'react';

// IMPORTANT: Replace with your bot's username from @BotFather
const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'YOUR_BOT_USERNAME_HERE';

export default function LoginPage() {
  
  useEffect(() => {
    // Define the callback function that the Telegram script will call
    (window as any).onTelegramAuth = (user: TelegramUser) => {
      // Call the server action to verify and create a session
      createSession(user).catch(console.error);
    };

    return () => {
      delete (window as any).onTelegramAuth;
    }
  }, []);
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sheet className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">SheetFlow</CardTitle>
          <CardDescription>Please sign in with your Telegram account.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center">
          <div id="telegram-login-widget"></div>
          <Script
            src="https://telegram.org/js/telegram-widget.js?22"
            onLoad={() => {
              (window as any).Telegram.Login.auth(
                { bot_id: BOT_USERNAME, request_access: true },
                (data: TelegramUser | false) => {
                  if (data) {
                    (window as any).onTelegramAuth(data);
                  }
                }
              );
            }}
            strategy="afterInteractive"
          />
           <div id="telegram-login-button" className="mt-4">
            <Script
              async
              src="https://telegram.org/js/telegram-widget.js?22"
              data-telegram-login={BOT_USERNAME}
              data-size="large"
              data-onauth="onTelegramAuth(user)"
              data-request-access="write"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
