// middleware.ts (in project root or src/ folder)

import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware'; // Helper for session management
import { createServerClient } from '@supabase/ssr'; // Need this to check auth status *after* session update

// --- Configuration ---
// 1. Define public paths (accessible without login)
const publicPaths = [
    '/login',
    '/signup', // Add if you have a signup page
    '/auth/callback', // Supabase OAuth callback
    // Add any other public pages like '/' (homepage), '/about', etc. if needed
    // '/'
];

// 2. Define paths accessible only when NOT logged in (e.g., login/signup)
const authRoutes = ['/login', '/signup'];

// 3. Define the default path to redirect to after successful login
const defaultAuthenticatedPath = '/dashboard';
// ---

export async function middleware(request: NextRequest) {
  // 1. Update the user's session based on the request cookies
  // This also refreshes the session token if needed.
  // It returns a response object that needs to be returned or modified.
  const response = await updateSession(request);

  // 2. Check authentication status *after* the session is potentially updated.
  // Create a Supabase client that can read the cookies from the request
  // (potentially updated by `updateSession` if tokens were refreshed and set on the request object)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        // We don't need set/remove here as updateSession handles writes
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();

  // 3. Routing Logic
  const { pathname } = request.nextUrl;

  // Check if the current path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Check if the current path is an auth route (login/signup)
  const isAuthRoute = authRoutes.some(path => pathname.startsWith(path));

  // Redirect logged-in users trying to access auth routes (login/signup)
  if (user && isAuthRoute) {
    console.log(`Middleware: User logged in, redirecting from ${pathname} to ${defaultAuthenticatedPath}`);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = defaultAuthenticatedPath;
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect non-logged-in users trying to access protected routes
  if (!user && !isPublicPath) {
    console.log(`Middleware: User not logged in, redirecting from protected route ${pathname} to /login`);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    // Optional: Append the original path as a 'next' query param
    // redirectUrl.searchParams.set(`next`, pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 4. If no redirection is needed, continue with the response from updateSession
  // This ensures cookies (like refreshed auth tokens) are set correctly.
  return response;
}

// --- Matcher Configuration ---
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ (API routes, assuming they handle their own auth or are public)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};