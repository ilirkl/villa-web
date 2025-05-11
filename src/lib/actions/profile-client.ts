import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/definitions';

// Client-side version of getProfile
export async function getProfileClient(): Promise<{ data: Profile | null; error: any }> {
  const supabase = createClient();

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

// Client-side version of updateProfile
export async function updateProfileClient(
  profile: Partial<Profile>
): Promise<{ success: boolean; error: any }> {
  const supabase = createClient();

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