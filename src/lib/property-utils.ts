/**
 * Utility functions for property management
 */

/**
 * Generates a color based on the property name for consistent avatar colors
 */
export function getPropertyColor(name: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
    '#F9E79F', '#A9DFBF', '#F5B7B1', '#AED6F1', '#D2B4DE'
  ];
  
  // Simple hash function to get consistent color for same name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Gets the first letter of the property name for the avatar icon
 */
export function getPropertyInitial(name: string): string {
  if (!name || name.length === 0) return '?';
  return name.charAt(0).toUpperCase();
}

/**
 * Generates an avatar icon for a property
 */
export function generatePropertyIcon(name: string): {
  initial: string;
  color: string;
} {
  return {
    initial: getPropertyInitial(name),
    color: getPropertyColor(name)
  };
}

/**
 * Gets the selected property ID from localStorage or cookies (for client-side use)
 */
export async function getSelectedPropertyId(): Promise<string | null> {
  // Try localStorage first (client-side)
  if (typeof window !== 'undefined') {
    const savedPropertyId = localStorage.getItem('selectedPropertyId');
    if (savedPropertyId) {
      return savedPropertyId;
    }
    
    // If not in localStorage, try cookies
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [name, value] = cookie.trim().split('=');
      acc[name] = value;
      return acc;
    }, {} as Record<string, string>);
    
    const cookiePropertyId = cookies['selectedPropertyId'];
    if (cookiePropertyId) {
      return cookiePropertyId;
    }
  }
  
  // Return null if no property is selected
  return null;
}

/**
 * Gets the user's properties and automatically selects the only property if user has just one
 */
export async function getPropertiesWithAutoSelection(supabase: any): Promise<{
  properties: any[];
  selectedPropertyId: string | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { properties: [], selectedPropertyId: null };
    }

    const { data, error } = await supabase
      .from('properties')
      .select('id, name, address, is_active')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const properties = data || [];
    
    // If user has only one property, automatically select it
    if (properties.length === 1) {
      const singleProperty = properties[0];
      
      // Save to localStorage and cookies for consistency
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedPropertyId', singleProperty.id);
        document.cookie = `selectedPropertyId=${singleProperty.id}; path=/; max-age=31536000; SameSite=Lax`;
      }
      
      return { properties, selectedPropertyId: singleProperty.id };
    }
    
    // For multiple properties, use existing selection logic
    const selectedPropertyId = await getSelectedPropertyId();
    
    return { properties, selectedPropertyId };
  } catch (error) {
    console.error('Error loading properties:', error);
    return { properties: [], selectedPropertyId: null };
  }
}

/**
 * Force refresh the selected property from storage
 */
export async function refreshSelectedPropertyId(): Promise<string | null> {
  // Clear any cached values and re-read from storage
  if (typeof window !== 'undefined') {
    // Try localStorage first (most reliable for client-side)
    const localStorageId = localStorage.getItem('selectedPropertyId');
    if (localStorageId) {
      // Sync to cookie as well
      document.cookie = `selectedPropertyId=${localStorageId}; path=/; max-age=31536000; SameSite=Lax`;
      return localStorageId;
    }
    
    // Fallback to cookie
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [name, value] = cookie.trim().split('=');
      acc[name] = value;
      return acc;
    }, {} as Record<string, string>);
    
    const cookiePropertyId = cookies['selectedPropertyId'];
    if (cookiePropertyId) {
      // Sync to localStorage
      localStorage.setItem('selectedPropertyId', cookiePropertyId);
      return cookiePropertyId;
    }
  }
  
  return null;
}