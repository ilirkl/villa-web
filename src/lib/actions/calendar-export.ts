'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';

export async function getIcalToken() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('ical_token')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching ical token:', error);
        return { error: 'Failed to fetch token' };
    }

    return { token: data.ical_token };
}

export async function regenerateIcalToken() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    // Generate a secure random token
    const token = randomBytes(32).toString('hex');

    const { error } = await supabase
        .from('profiles')
        .update({ ical_token: token })
        .eq('id', user.id);

    if (error) {
        console.error('Error updating ical token:', error);
        return { error: 'Failed to update token' };
    }

    revalidatePath('/settings');
    return { token };
}
