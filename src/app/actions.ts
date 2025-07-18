'use server';

import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import type {AppUser} from '@/lib/types';

// Helper to create a hash from a string (for simple unique ID generation)
function hashCode(str: string): number {
  var hash = 0,
    i,
    chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

export async function createSession(email: string) {
  // In a real app, you would verify the user here (e.g., check password, send magic link)
  // For this demo, we'll create a session for any provided email.

  const id = hashCode(email);
  const username = email.split('@')[0];
  const initial = username.charAt(0).toUpperCase();

  const sessionUser: AppUser = {
    id: id,
    email: email,
    username: username,
    firstName: username.charAt(0).toUpperCase() + username.slice(1),
    photoUrl: `https://placehold.co/40x40/212529/F8F9FA/png?text=${initial}`,
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

export async function getSession(): Promise<AppUser | null> {
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