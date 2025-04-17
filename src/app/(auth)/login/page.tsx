// app/(auth)/login/page.tsx
'use client'; // Auth UI requires client-side rendering

import { createClient } from '@/lib/supabase/client'; // Use client helper
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared'; // Or other themes like ThemeMinimal
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner'; // Assuming you're using sonner for toasts

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [redirectUrl, setRedirectUrl] = useState<string>('');

  useEffect(() => {
    // Set redirect URL only on client side
    const url = window.location.origin;
    setRedirectUrl(`${url}/auth/callback`);
    
    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in, redirecting...');
        const next = searchParams.get('next') ?? '/dashboard';
        router.push(next);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, searchParams, supabase.auth]);

  // Don't render Auth component until we have the redirect URL
  if (!redirectUrl) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome Back</CardTitle>
        <CardDescription>Sign in to manage your villa</CardDescription>
      </CardHeader>
      <CardContent>
        <Auth
          supabaseClient={supabase}
          appearance={{ 
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#404040',
                  brandAccent: '#222222',
                }
              }
            }
          }}
          providers={['google']}
          redirectTo={redirectUrl}
          onlyThirdPartyProviders={false}
          showLinks={true}
          view="sign_in"
          theme="default"
          onError={(error) => {
            console.error('Auth error:', error);
            toast.error('Authentication Error', {
              description: error.message,
            });
          }}
        />
      </CardContent>
    </Card>
  );
}
