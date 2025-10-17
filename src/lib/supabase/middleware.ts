import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { setCsrfToken } from '../csrf';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Set CSRF token
  setCsrfToken(request, response);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-session-with-middleware
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // If there's an auth error (like invalid refresh token), clear the session
  if (error) {
    console.log('Auth error in middleware:', error.message);
    // Clear auth cookies to force re-authentication
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');
  }

  return response;
}

export async function checkAuth(request: NextRequest) {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
            },
        }
    )
    const { data: { session } } = await supabase.auth.getSession()

    return session;
}
