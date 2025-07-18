'use server';

import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {createHmac} from 'crypto';
import type {TelegramUser} from '@/lib/types';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set!');
}

const SECRET_KEY = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();

export async function createSession(user: TelegramUser) {
  const dataCheckString = Object.keys(user)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${user[key as keyof Omit<TelegramUser, 'hash'>]}`)
    .join('\n');

  const hash = createHmac('sha256', SECRET_KEY).update(dataCheckString).digest('hex');

  if (hash !== user.hash) {
    throw new Error('Invalid hash, authentication failed.');
  }

  const sessionUser = {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    photoUrl: user.photo_url,
  };

  cookies().set('session', JSON.stringify(sessionUser), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // One week
    path: '/',
    sameSite: 'lax',
  });

  redirect('/');
}

export async function getSession() {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;
  try {
    return JSON.parse(sessionCookie);
  } catch {
    return null;
  }
}

export async function deleteSession() {
  cookies().delete('session');
  redirect('/login');
}
