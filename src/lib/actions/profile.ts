import { createActionClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Profile } from '@/lib/definitions';

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

export async function updateProfile(profile: Partial<Profile>): Promise<{ error: any }> {
  const cookieStore = cookies();
  const supabase = createActionClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { error: userError || new Error('No authenticated user') };
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        ...profile,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return { error };
  } catch (error) {
    return { error };
  }
}