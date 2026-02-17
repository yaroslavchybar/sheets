import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value;

  // If no session and not on login page, redirect to login
  if (!sessionToken && request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If has session and on login page, redirect to home
  if (sessionToken && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
}
