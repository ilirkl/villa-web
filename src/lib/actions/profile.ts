import { createActionClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Profile } from '@/lib/definitions';
import { getServerCsrfToken } from '@/lib/csrf';

export async function getProfile(): Promise<{ data: Profile | null; error: any }> {
  const cookieStore = cookies();
  const supabase = createActionClient();

  try {
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { data: null, error: userError || new Error('No authenticated user') };
    }

    // Fetch the profile data
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateProfile(
  profile: Partial<Profile>, 
  csrfToken: string
): Promise<{ success: boolean; error: any }> {
  const cookieStore = cookies();
  const supabase = createActionClient();
  const serverCsrfToken = getServerCsrfToken();

  // Verify CSRF token
  if (!csrfToken || !serverCsrfToken || csrfToken !== serverCsrfToken) {
    return { 
      success: false, 
      error: new Error('Security verification failed') 
    };
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { 
        success: false, 
        error: userError || new Error('No authenticated user') 
      };
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        ...profile,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return { 
      success: !error, 
      error 
    };
  } catch (error) {
    return { 
      success: false, 
      error 
    };
  }
}
