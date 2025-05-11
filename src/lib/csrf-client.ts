// Client-side CSRF utilities
let csrfToken: string | null = null;
let tokenFetchPromise: Promise<string> | null = null;

// Get CSRF token (cached)
export async function getCsrfToken(): Promise<string> {
  // Return cached token if available
  if (csrfToken) return csrfToken;
  
  // If a fetch is already in progress, return that promise
  if (tokenFetchPromise) return tokenFetchPromise;
  
  // Create a new fetch promise that always returns a string or throws
  const newPromise = (async (): Promise<string> => {
    try {
      console.log("Fetching new CSRF token from server");
      const response = await fetch('/api/csrf', {
        // Include credentials to ensure cookies are sent
        credentials: 'same-origin',
        // Add cache busting to prevent caching
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.csrfToken) {
        throw new Error('No CSRF token returned from server');
      }
      
      // Assign the token and ensure it's a string
      csrfToken = data.csrfToken as string;
      console.log("CSRF token received:", csrfToken.substring(0, 5) + "...");
      return csrfToken;
    } catch (error) {
      console.error("Error fetching CSRF token:", error);
      // Clear the promise so we can try again
      tokenFetchPromise = null;
      throw error;
    }
  })();
  
  // Store the promise
  tokenFetchPromise = newPromise;
  
  return newPromise;
}

// Reset the token (useful for testing or after logout)
export function resetCsrfToken(): void {
  csrfToken = null;
  tokenFetchPromise = null;
}

// Add CSRF token to fetch headers
export async function fetchWithCsrf(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getCsrfToken();
  // At this point token is guaranteed to be a string because getCsrfToken() 
  // either returns a string or throws an error
  
  const headers = new Headers(options.headers || {});
  headers.set('x-csrf-token', token);
  
  return fetch(url, {
    ...options,
    credentials: 'same-origin', // Always include credentials
    headers
  });
}





