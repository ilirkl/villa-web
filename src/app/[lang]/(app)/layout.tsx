// src/app/(app)/layout.tsx
import React from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { Header } from '@/components/shared/Header';
// Import the new sonner component
import { Toaster as Sonner } from "@/components/ui/sonner"; // Rename import to avoid conflict if desired, or just use Sonner

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Sidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14"> {/* Adjust pl */}
        <Header />
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
         {/* Use the new Sonner component */}
         {/* You might place it outside the inner div, directly in the body if preferred */}
         <Sonner richColors position="top-right" /> {/* Example props */}
      </div>
    </div>
  );
}