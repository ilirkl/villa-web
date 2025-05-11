import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

const CSRF_TOKEN_COOKIE = 'csrf_token';

export async function GET() {
  // Create a new token every time
  const token = nanoid(32);
  
  // Create response
  const response = NextResponse.json({ csrfToken: token });
  
  // Set cookie with the token
  response.cookies.set({
    name: CSRF_TOKEN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  
  console.log("New CSRF token created:", token.substring(0, 5) + "...");
  
  return response;
}

