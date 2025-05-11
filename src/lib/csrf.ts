import { nanoid } from 'nanoid';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// CSRF token cookie name
const CSRF_TOKEN_COOKIE = 'csrf_token';

// For server actions - get the token from cookies
export function getServerCsrfToken(): string {
  const cookieStore = cookies();
  let token = cookieStore.get(CSRF_TOKEN_COOKIE)?.value;
  
  // If no token exists, create one
  if (!token) {
    token = nanoid(32);
    
    // Set the cookie
    cookieStore.set(CSRF_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    
    console.log("New server CSRF token created:", token.substring(0, 5) + "...");
  } else {
    console.log("Using existing server CSRF token:", token.substring(0, 5) + "...");
  }
  
  return token;
}

// For middleware - set CSRF token in response
export function setCsrfToken(request: NextRequest, response: NextResponse): void {
  // Check if token already exists in cookies
  const token = request.cookies.get(CSRF_TOKEN_COOKIE)?.value || nanoid(32);
  
  // Set the token in the response
  response.cookies.set({
    name: CSRF_TOKEN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

// For middleware - verify CSRF token in request
export function verifyCsrfToken(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_TOKEN_COOKIE)?.value;
  const headerToken = request.headers.get('x-csrf-token');
  
  if (!cookieToken || !headerToken) {
    console.log('CSRF verification failed: Missing token');
    return false;
  }
  
  const isValid = cookieToken === headerToken;
  if (!isValid) {
    console.log('CSRF verification failed: Token mismatch');
  }
  
  return isValid;
}


