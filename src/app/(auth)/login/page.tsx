// app/(auth)/login/page.tsx
'use client'; // Auth UI requires client-side rendering

import { createClient } from '@/lib/supabase/client'; // Use client helper
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared'; // Or other themes like ThemeMinimal
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  // IMPORTANT: Create client inside the component for client-side usage
  const supabase = createClient();

  // Get base URL for redirection - important for OAuth providers
  // Ensure NEXT_PUBLIC_APP_URL is set in your .env.local pointing to your deployment URL (or http://localhost:3000 for dev)
  const getURL = () => {
    let url =
      process?.env?.NEXT_PUBLIC_APP_URL ?? // Set this to your site URL in production
      process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
      'http://localhost:3000/';
    // Make sure to include `https` in production URLs.
    url = url.includes('http') ? url : `https://${url}`;
    // Make sure to include a trailing `/`.
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
    return url;
  };


  return (
    <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to manage your villa</CardDescription>
        </CardHeader>
        <CardContent>
            <Auth
                supabaseClient={supabase}
                appearance={{ theme: ThemeSupa }} // Apply Supabase theme
                providers={['google']} // Add other providers like 'github', 'azure' etc. Ensure they are enabled in Supabase dashboard
                redirectTo={`${getURL()}auth/callback`} // Critical for OAuth providers
                // theme="dark" // Optional: Force dark theme if needed
                // socialLayout="horizontal" // Optional layout for social buttons
                // view="sign_in" // Can explicitly set to 'sign_in' or 'sign_up'
                 onlyThirdPartyProviders={false} // Set true if you ONLY want social logins
                 showLinks={true} // Show links for password reset, signup etc.
            />
        </CardContent>
    </Card>
  );
}