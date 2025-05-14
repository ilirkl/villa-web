'use client';

import { createClient } from '@/lib/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import { getDictionary } from '@/lib/dictionary';
import Cookies from 'js-cookie';


function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useParams();
  const supabase = createClient();
  const [redirectUrl, setRedirectUrl] = useState<string>('');
  const [dictionary, setDictionary] = useState<any>({});

  useEffect(() => {
    // Load dictionary
    async function loadDictionary() {
      try {
        const dict = await getDictionary(lang as 'en' | 'sq');
        setDictionary(dict);
        // Set language cookie for consistent experience
        Cookies.set('NEXT_LOCALE', lang as string, { path: '/' });
      } catch (error) {
        console.error('Failed to load dictionary:', error);
      }
    }
    loadDictionary();
    
    // Set redirect URL only on client side
    const url = window.location.origin;
    setRedirectUrl(`${url}/${lang}/auth/callback`);
    
    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in, redirecting...');
        const next = searchParams.get('next') ?? `/${lang}/dashboard`;
        router.push(next);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, searchParams, supabase.auth, lang]);

  // Don't render Auth component until we have the redirect URL and dictionary
  if (!redirectUrl || !dictionary) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Image 
            src="/images/favicon/android-chrome-192x192.png" 
            alt={dictionary.villa_ime_logo || "Villa Ime Logo"} 
            width={64} 
            height={64}
            priority
          />
        </div>
        <CardTitle className="text-2xl">{dictionary.welcome_back || "Welcome Back"}</CardTitle>
        <CardDescription>{dictionary.sign_in_to_manage || "Sign in to manage your villa"}</CardDescription>
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
            },
            className: {
              button: 'auth-button',
              input: 'auth-input',
              label: 'auth-label',
              message: 'auth-message',
            }
          }}
          providers={[]}
          redirectTo={redirectUrl}
          onlyThirdPartyProviders={false}
          showLinks={true}
          view="sign_in"
          theme="default"
          
          localization={{
            variables: {
              sign_in: {
                email_label: dictionary.email || "Email",
                password_label: dictionary.password || "Password",
                button_label: dictionary.sign_in || "Sign in",
                loading_button_label: dictionary.signing_in || "Signing in...",
                social_provider_text: dictionary.sign_in_with || "Sign in with {{provider}}",
                link_text: dictionary.dont_have_account || "Don't have an account? Sign up",
              },
              sign_up: {
                email_label: dictionary.email || "Email",
                password_label: dictionary.password || "Password",
                button_label: dictionary.sign_up || "Sign up",
                loading_button_label: dictionary.signing_up || "Signing up...",
                link_text: dictionary.already_have_account || "Already have an account? Sign in",
              },
              forgotten_password: {
                email_label: dictionary.email || "Email",
                password_label: dictionary.password || "Password",
                button_label: dictionary.send_reset_instructions || "Send reset instructions",
                loading_button_label: dictionary.sending_reset_instructions || "Sending reset instructions...",
                link_text: dictionary.forgot_password || "Forgot your password?",
              },
              update_password: {
                password_label: dictionary.new_password || "New password",
                button_label: dictionary.update_password || "Update password",
                loading_button_label: dictionary.updating_password || "Updating password...",
              },
              verify_otp: {
                email_input_label: dictionary.email || "Email",
                phone_input_label: dictionary.phone || "Phone",
                token_input_label: dictionary.token || "Token",
                button_label: dictionary.verify || "Verify",
                loading_button_label: dictionary.verifying || "Verifying...",
              }
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  const { lang } = useParams();
  const [dictionary, setDictionary] = useState<any>({});

  useEffect(() => {
    async function loadDictionary() {
      try {
        const dict = await getDictionary(lang as 'en' | 'sq');
        setDictionary(dict);
      } catch (error) {
        console.error('Failed to load dictionary:', error);
      }
    }
    loadDictionary();
  }, [lang]);

  return (
    <Suspense fallback={
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image 
              src="/images/favicon/favicon-32x32.png" 
              alt={dictionary.villa_ime_logo || "Villa Ime Logo"} 
              width={32} 
              height={32}
              priority
            />
          </div>
          <CardTitle className="text-2xl">{dictionary.welcome_back || "Welcome Back"}</CardTitle>
          <CardDescription>{dictionary.loading_login_options || "Loading login options..."}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-4">
            <div className="animate-pulse h-48 w-full bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    }>
      <LoginContent />
    </Suspense>
  );
}
