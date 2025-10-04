'use client';

/**
 * Utility functions for property management
 */

/**
 * Gets the currently selected property ID from localStorage
 * @returns The selected property ID or null if not set
 */
export function getSelectedPropertyId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('selectedPropertyId');
}

/**
 * Sets the selected property ID in localStorage
 * @param propertyId The property ID to set
 */
export function setSelectedPropertyId(propertyId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem('selectedPropertyId', propertyId);
}

/**
 * Gets the selected property ID for server-side usage
 * This should be called from server components/actions
 * @param headers Request headers for server-side usage
 * @returns The selected property ID or null if not set
 */
export async function getSelectedPropertyIdServer(headers?: Headers): Promise<string | null> {
  // For server-side usage, we need to get the property ID from cookies
  // This requires the headers to be passed from the server component
  if (headers) {
    const cookieHeader = headers.get('cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        acc[name] = value;
        return acc;
      }, {} as Record<string, string>);
      
      return cookies['selectedPropertyId'] || null;
    }
  }
  
  // Fallback: try to get from localStorage (won't work in server components)
  if (typeof window !== 'undefined') {
    return localStorage.getItem('selectedPropertyId');
  }
  
  return null;
}

/**
 * Validates if a property ID belongs to the current user
 * @param supabase Supabase client
 * @param propertyId The property ID to validate
 * @returns Promise<boolean> True if the property belongs to the current user
 */
export async function validateUserProperty(
  supabase: any,
  propertyId: string
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('user_id', user.id)
      .single();

    if (error || !data) return false;
    return true;
  } catch (error) {
    console.error('Error validating user property:', error);
    return false;
  }
}