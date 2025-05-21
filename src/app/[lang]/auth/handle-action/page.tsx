// app/auth/handle-action/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';

// A simple loading component (optional, but good UX)
function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{
        border: '4px solid rgba(0, 0, 0, 0.1)',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        borderLeftColor: '#09f', // Or your brand color
        animation: 'spin 1s ease infinite'
      }}></div>
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <p style={{ marginLeft: '10px' }}>Processing...</p>
    </div>
  );
}

export default function AuthActionHandlerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const lang = Cookies.get('NEXT_LOCALE') || 'en'; // Default to 'en' or your app's default
    const hash = window.location.hash; // e.g., #recovery_token=...
    const query = searchParams.toString(); // Preserve any query params just in case

    // Your login page is at /[lang]/login (due to the (auth) route group)
    let redirectToPath = `/${lang}/login`;

    const fullRedirectUrl = `${redirectToPath}${query ? `?${query}` : ''}${hash}`;

    console.log('AuthActionHandler: Detected lang:', lang);
    console.log('AuthActionHandler: Detected hash:', hash);
    console.log('AuthActionHandler: Redirecting to:', fullRedirectUrl);

    // Use replace to not add this utility page to browser history
    router.replace(fullRedirectUrl);

  }, [router, searchParams]);

  return <LoadingSpinner />; // Show a loader while redirecting
}