// app/(auth)/layout.tsx
import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Center content vertically and horizontally
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      {children}
    </div>
  );
}