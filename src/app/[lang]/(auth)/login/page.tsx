'use client';

import { createClient } from '@/lib/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
// import { toast } from 'sonner'; // Keep if you use it elsewhere, not used in this snippet
import Image from 'next/image';
import { getDictionary } from '@/lib/dictionary';
import Cookies from 'js-cookie';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useParams() as { lang: 'en' | 'sq' }; // Type lang more strictly if possible
  const supabase = createClient();
  const [redirectUrl, setRedirectUrl] = useState<string>('');
  const [dictionary, setDictionary] = useState<any>({}); // Consider typing your dictionary

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

    // --- CRUCIAL CHANGE STARTS HERE ---
    // Set redirect URL for the Auth component.
    // This URL tells Supabase where to redirect users *after* they click an email link
    // (e.g., password reset, magic link, email confirmation).
    // It must point to your client-side handle-action page.
    const actionHandlerUrl = `${window.location.origin}/auth/handle-action`;
    setRedirectUrl(actionHandlerUrl);
    console.log("LoginContent: redirectTo for Auth component set to:", actionHandlerUrl);
    // --- CRUCIAL CHANGE ENDS HERE ---

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('LoginContent: Auth state changed:', event, session);

      if (event === 'SIGNED_IN' && session) {
        console.log('LoginContent: User SIGNED_IN.');
        const nextQueryParam = searchParams.get('next');
        let redirectToPath;

        if (nextQueryParam) {
          // Ensure 'next' starts with a slash
          const safeNextQueryParam = nextQueryParam.startsWith('/') ? nextQueryParam : `/${nextQueryParam}`;
          // Check if 'next' is already lang-prefixed
          if (safeNextQueryParam.startsWith(`/${lang}/`)) {
              redirectToPath = safeNextQueryParam;
          } else {
              // Prepend lang if not already prefixed
              redirectToPath = `/${lang}${safeNextQueryParam}`;
          }
        } else {
          redirectToPath = `/${lang}/dashboard`;
        }
        console.log('LoginContent: Redirecting to:', redirectToPath);
        router.push(redirectToPath); // Use push for navigation after login
      } else if (event === 'PASSWORD_RECOVERY') {
        // This event means the user has landed on this page with a #recovery_token in the URL.
        // The Supabase Auth UI component should automatically detect this and switch
        // to the "update_password" view. No explicit navigation needed here.
        console.log('LoginContent: PASSWORD_RECOVERY event detected. Auth UI should handle view change.');
      } else if (event === 'USER_UPDATED' && session) {
        console.log('LoginContent: USER_UPDATED event detected. Session:', session);
        // This often fires after a password update. The 'SIGNED_IN' event might also fire.
        // If not already redirecting, you might consider a redirect here if needed.
        // For password recovery, 'SIGNED_IN' typically handles the post-update redirect.
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, searchParams, supabase.auth, lang]);

  // Don't render Auth component until essential async operations are complete
  if (!redirectUrl || Object.keys(dictionary).length === 0) {
    // Return a loading state similar to your Suspense fallback for consistency
    // or a simpler one if preferred.
    return (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {/* Using a generic or smaller logo for this intermediate state might be good */}
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
          redirectTo={redirectUrl} // This now correctly points to /auth/handle-action
          onlyThirdPartyProviders={false}
          showLinks={true} // This enables "Forgot your password?" link
          view="sign_in" // Default view
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
                password_label: dictionary.password || "Password", // Not usually shown on forgot password view itself
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

// Your LoginPage component (default export) remains the same:
export default function LoginPage() {
  const { lang } = useParams() as { lang: 'en' | 'sq' };
  const [dictionary, setDictionary] = useState<any>({}); // For the Suspense fallback

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
    // This check is a bit tricky with server components. If you're using Suspense,
    // the fallback might need dictionary on the server. Otherwise, this effect
    // would typically only run on the client.
    // For a client-side Suspense fallback, dictionary loading should happen
    // in the client component that renders the fallback.
    // For simplicity, for the purpose of this solution, we assume it's handled.
    if (typeof window === 'undefined') {
        loadDictionaryForFallback();
    }
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