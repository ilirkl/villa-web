// src/app/[lang]/(app)/layout.tsx
import React from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import { Header } from '@/components/shared/Header';
import { Toaster } from "@/components/ui/sonner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 overflow-x-hidden">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex flex-1 flex-col sm:gap-4 sm:py-4 sm:pl-14 w-full">
          <main className="flex-1 p-2 sm:px-6 sm:py-0 md:gap-8 max-w-full">
            {children}
          </main>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
