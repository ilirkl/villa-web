'use client';

import { createClient } from '@/lib/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState, Suspense, useMemo } from 'react'; // Added useMemo
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Image from 'next/image';
import { getDictionary } from '@/lib/dictionary';
import Cookies from 'js-cookie';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useParams() as { lang: 'en' | 'sq' };
  const supabase = createClient();
  const [dictionary, setDictionary] = useState<any>({});

  // --- CRUCIAL ADDITION: Determine initial view based on URL hash ---
  const initialAuthView = useMemo(() => {
    // This check is important as useMemo might run on server during SSR
    if (typeof window === 'undefined') {
      return 'sign_in'; // Default server-side
    }
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('recovery_token=')) {
      return 'update_password';
    }
    // You can add other hash-based views here if needed (e.g., 'magic_link', 'sign_up' for invites)
    // else if (hash.includes('type=invite') || hash.includes('invite_token=')) {
    //   return 'sign_up';
    // }
    // Add logic for 'email_signin' if you use magic links and want to go straight to email confirmation
    // else if (hash.includes('type=magiclink')) {
    //   return 'magic_link';
    // }
    return 'sign_in'; // Default view if no specific hash is found
  }, []); // Empty dependency array means this runs only once on mount

  useEffect(() => {
    async function loadDictionaryAndSetCookie() {
      try {
        const dict = await getDictionary(lang);
        setDictionary(dict);
        Cookies.set('NEXT_LOCALE', lang, { path: '/' });
        console.log('LoginContent: Dictionary loaded and NEXT_LOCALE cookie set to:', lang);
      } catch (error) {
        console.error('LoginContent: Failed to load dictionary:', error);
      }
    }
    loadDictionaryAndSetCookie();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('LoginContent: Auth state changed:', event, session);

      if (event === 'SIGNED_IN' && session) {
        // Check the *current* Auth UI view. If it's update_password, we don't redirect yet.
        // This handles cases where the session might already be active from the token in the hash.
        if (initialAuthView === 'update_password') { // Use initialAuthView to check if we're in a recovery flow
          console.log('LoginContent: User SIGNED_IN, but in PASSWORD_RECOVERY flow (as per initialAuthView). Awaiting password update via Auth UI.');
          // Do nothing here. The Auth UI component should be showing the update_password form.
          // The redirect to dashboard will happen when 'USER_UPDATED' event fires.
        } else {
          // This is a normal sign-in (email/password, OAuth, or magiclink where user is already authenticated).
          console.log('LoginContent: User SIGNED_IN (normal flow or completed magiclink). Redirecting...');
          const nextQueryParam = searchParams.get('next');
          let redirectToPath;

          if (nextQueryParam) {
            const safeNextQueryParam = nextQueryParam.startsWith('/') ? nextQueryParam : `/${nextQueryParam}`;
            if (safeNextQueryParam.startsWith(`/${lang}/`)) {
                redirectToPath = safeNextQueryParam;
            } else {
                redirectToPath = `/${lang}${safeNextQueryParam}`;
            }
          } else {
            redirectToPath = `/${lang}/dashboard`;
          }
          console.log('LoginContent: Redirecting to:', redirectToPath);
          router.push(redirectToPath);
        }
      } else if (event === 'PASSWORD_RECOVERY') {
        // This event means Supabase detected a recovery token and the Auth UI
        // component should switch its view (which initialAuthView already handled).
        console.log('LoginContent: PASSWORD_RECOVERY event detected. Auth UI should handle view change.');
      } else if (event === 'USER_UPDATED' && session) {
        // This event typically fires AFTER a password update (or profile update).
        // This is the definitive signal to redirect after successful password change.
        console.log('LoginContent: USER_UPDATED event detected. Redirecting to dashboard.');
        router.push(`/${lang}/dashboard`);
      } else if (event === 'SIGNED_OUT') {
        console.log('LoginContent: User SIGNED_OUT.');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, searchParams, supabase.auth, lang, initialAuthView]);

  if (Object.keys(dictionary).length === 0) {
    return (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Image
                src="/images/favicon/favicon-32x32.png"
                alt={dictionary.villa_ime_logo || "Villa Ime Logo Loading"}
                width={32}
                height={32}
                priority
              />
            </div>
            <CardTitle className="text-2xl">{dictionary.loading_auth || "Loading Authentication..."}</CardTitle>
            <CardDescription>{dictionary.please_wait || "Please wait a moment."}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center p-4">
              <div className="animate-pulse h-48 w-full bg-gray-200 rounded-md"></div>
            </div>
          </CardContent>
        </Card>
    );
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
          redirectTo={`/${lang}/dashboard`}
          onlyThirdPartyProviders={false}
          showLinks={true} // This enables "Forgot your password?" link
          view={initialAuthView} // <--- THIS IS THE CRUCIAL CHANGE: Dynamic view prop
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
                button_label: dictionary.send_reset_instructions || "Send reset instructions",
                loading_button_label: dictionary.sending_reset_instructions || "Sending reset instructions...",
                link_text: dictionary.forgot_password || "Forgot your password?",
              },
              update_password: {
                password_label: dictionary.new_password || "New password",
                button_label: dictionary.update_password || "Update password",
                loading_button_label: dictionary.updating_password || "Updating password...",
              },
              verify_otp: { /* ... */ }
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  const { lang } = useParams() as { lang: 'en' | 'sq' };
  const [dictionary, setDictionary] = useState<any>({});

  useEffect(() => {
    async function loadDictionaryForFallback() {
      try {
        const dict = await getDictionary(lang);
        setDictionary(dict);
      } catch (error)
{
        console.error('LoginPage Fallback: Failed to load dictionary:', error);
      }
    }
    loadDictionaryForFallback();
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