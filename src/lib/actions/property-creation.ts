'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * Ensures the current user has at least one property.
 * Creates a default property if none exists.
 */
export async function ensureUserHasProperty(): Promise<{
  success: boolean;
  propertyId?: string;
  error?: string;
}> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if user already has properties
    const { data: existingProperties, error: fetchError } = await supabase
      .from('properties')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (fetchError) {
      console.error('Error fetching user properties:', fetchError);
      return { success: false, error: 'Failed to fetch properties' };
    }

    // If user has no properties, create a default one
    if (!existingProperties || existingProperties.length === 0) {
      const { data: newProperty, error: createError } = await supabase
        .from('properties')
        .insert({
          name: 'My Villa',
          user_id: user.id,
          is_active: true
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating default property:', createError);
        return { success: false, error: 'Failed to create default property' };
      }

      // Update profile with default property
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ default_property_id: newProperty.id })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile with default property:', profileError);
        // Continue anyway, as the property was created successfully
      }

      return { success: true, propertyId: newProperty.id };
    }

    return { success: true, propertyId: existingProperties[0].id };
  } catch (error) {
    console.error('Error in ensureUserHasProperty:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Gets or creates a default property for the current user
 */
export async function getOrCreateDefaultProperty(): Promise<string | null> {
  const result = await ensureUserHasProperty();
  return result.propertyId || null;
}