// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'; // Use server helper
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'; // Default redirect to dashboard

  console.log(`Auth Callback received. Code: ${code ? 'Present' : 'Missing'}, Origin: ${origin}, Next: ${next}`);


  if (code) {
    const supabase = createClient(); // Don't pass cookieStore, it's handled internally
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      console.log('Auth Callback: Code exchange successful. Redirecting to:', next);
      return NextResponse.redirect(`${origin}${next}`); // Redirect to dashboard or intended page
    } else {
        console.error("Auth Callback Error exchanging code:", error.message);
        // Redirect to an error page or login page with error message
         return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
    }
  } else {
      console.error("Auth Callback Error: No code found in query params.");
       // Redirect to an error page or login page
       return NextResponse.redirect(`${origin}/login?error=Authentication failed`);
  }

}
