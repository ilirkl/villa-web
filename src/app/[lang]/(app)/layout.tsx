// src/app/(app)/layout.tsx
import React from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
// Remove Header import
import { Toaster as Sonner } from "@/components/ui/sonner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Sidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        {/* Remove Header component */}
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
        <Sonner richColors position="top-right" />
      </div>
    </div>
  );
}
