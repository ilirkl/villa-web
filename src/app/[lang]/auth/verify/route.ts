import { createClient } from '@/lib/supabase/server';
import { type EmailOtpType } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers'; // Import cookies to get lang

export async function GET(
  request: NextRequest,
  { params }: { params: { lang: string } } // Get lang from params
) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next'); // next is optional

  const lang = params.lang; // Get lang from the dynamic segment

  if (token_hash && type) {
    const supabase = createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      // Redirect user based on type
      if (type === 'recovery') {
        // For recovery, redirect to the login page with the hash to show the update password form
        // The Auth component on the login page reads the hash and shows the correct view
        redirect(`/${lang}/login#update_password`);
      } else if (next) {
        // For other types like email verification, redirect to the 'next' parameter
        // Ensure 'next' is a valid path relative to the origin
         // Ensure 'next' starts with a slash and handle lang prefix if necessary
         let redirectToPath = next.startsWith('/') ? next : `/${next}`;
         if (!redirectToPath.startsWith(`/${lang}/`)) {
             redirectToPath = `/${lang}${redirectToPath}`;
         }
         redirect(redirectToPath);
      } else {
        // Default redirect for other verification types if 'next' is not provided
        redirect(`/${lang}/dashboard`);
      }
    } else {
      // redirect the user to the login page with an error
      console.error('Supabase verifyOtp error:', error);
      redirect(`/${lang}/login?error=${encodeURIComponent(error.message)}`);
    }
  } else {
    // redirect the user to the login page with an error if token or type is missing
    console.error('Missing token_hash or type in callback URL');
    redirect(`/${lang}/login?error=${encodeURIComponent("Invalid token or type.")}`);
  }
}