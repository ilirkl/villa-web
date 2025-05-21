// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // Import cookies

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const cookieStore = cookies();
  const langFromCookie = cookieStore.get('NEXT_LOCALE')?.value || 'en'; // Default language

  // The 'next' param might be passed by Supabase if it was part of the redirectTo
  // or you might want to define a default based on language
  let nextPathParam = searchParams.get('next');

  let finalRedirectPath: string;

  if (nextPathParam) {
    // Ensure 'next' starts with a slash
    if (!nextPathParam.startsWith('/')) {
      nextPathParam = `/${nextPathParam}`;
    }
    // Check if 'next' is already lang-prefixed
    if (nextPathParam.startsWith(`/${langFromCookie}/`)) {
      finalRedirectPath = nextPathParam;
    } else {
      // Prepend lang if not already prefixed
      finalRedirectPath = `/${langFromCookie}${nextPathParam}`;
    }
  } else {
    // Default redirect path if 'next' is not provided
    finalRedirectPath = `/${langFromCookie}/dashboard`;
  }

  console.log(`Auth Callback: Code: ${code ? 'Present' : 'Missing'}, Origin: ${origin}, Lang: ${langFromCookie}, Next Param: ${searchParams.get('next')}, Final Redirect Path: ${finalRedirectPath}`);

  if (code) {
    const supabase = createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      console.log('Auth Callback: Code exchange successful. Redirecting to:', `${origin}${finalRedirectPath}`);
      // The redirect URL must be absolute.
      return NextResponse.redirect(new URL(finalRedirectPath, origin).toString());
    } else {
      console.error("Auth Callback Error exchanging code:", error?.message);
      const errorRedirectPath = `/${langFromCookie}/login?error=auth_code_exchange_failed&message=${encodeURIComponent(error?.message || 'Could not authenticate user')}`;
      return NextResponse.redirect(new URL(errorRedirectPath, origin).toString());
    }
  } else {
    console.error("Auth Callback Error: No code found in query params.");
    const errorRedirectPath = `/${langFromCookie}/login?error=no_auth_code&message=Authentication failed: no code provided`;
    return NextResponse.redirect(new URL(errorRedirectPath, origin).toString());
  }
}