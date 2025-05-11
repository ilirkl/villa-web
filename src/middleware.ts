import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { checkAuth } from './lib/supabase/middleware';
import { setCsrfToken, verifyCsrfToken } from './lib/csrf';

const locales = ['en', 'sq'];
const defaultLocale = 'en';

function getLocale(request: NextRequest) {
  // Check for NEXT_LOCALE cookie first
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }

  // Negotiator expects plain object so we need to transform headers
  const headers = Object.fromEntries(request.headers);
  const languages = new Negotiator({ headers }).languages();
  
  return match(languages, locales, defaultLocale);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip CSRF check for public files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('/images/') ||
    pathname.includes('.')
  ) {
    return;
  }

  // For API routes, verify CSRF token for non-GET methods
  if (pathname.startsWith('/api') && request.method !== 'GET') {
    if (!verifyCsrfToken(request)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  // Check if there is any supported locale in the pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Get the locale for potential redirects
  const locale = getLocale(request);

  // Check if the route is protected (part of the app layout)
  const isProtectedRoute = 
    (pathnameHasLocale && (
      pathname.includes('/(app)') || 
      pathname.includes('/dashboard') || 
      pathname.includes('/revenue') || 
      pathname.includes('/bookings') ||
      pathname.includes('/expenses')
    )) || 
    (!pathnameHasLocale && (
      pathname.includes('/dashboard') || 
      pathname.includes('/revenue') || 
      pathname.includes('/bookings') ||
      pathname.includes('/expenses')
    ));

  // If it's a protected route, check authentication
  if (isProtectedRoute) {
    const session = await checkAuth(request);
    
    // If no session, redirect to login
    if (!session) {
      const loginPath = `/${locale}/login`;
      const redirectUrl = new URL(loginPath, request.url);
      
      // Add the current path as 'next' parameter for redirect after login
      if (pathnameHasLocale) {
        redirectUrl.searchParams.set('next', pathname);
      } else {
        redirectUrl.searchParams.set('next', `/${locale}${pathname}`);
      }
      
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Create response
  let response = NextResponse.next();
  
  // Set CSRF token for all responses
  setCsrfToken(request, response);

  // Handle locale redirects (only if not already handled)
  if (!pathnameHasLocale) {
    request.nextUrl.pathname = `/${locale}${pathname}`;
    response = NextResponse.redirect(request.nextUrl);
    response.cookies.set('NEXT_LOCALE', locale);
    
    // Set CSRF token on redirects too
    setCsrfToken(request, response);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
