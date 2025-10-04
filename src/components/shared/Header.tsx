'use client'; // Add this directive to mark as a client component

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { getDictionary } from '@/lib/dictionary';

export function Header() {
  // Use try/catch to handle potential params issues
  let lang = 'en'; // Default fallback
  try {
    const params = useParams();
    lang = params?.lang as string || 'en';
  } catch (error) {
    console.error('Error getting params:', error);
  }
  
  const pathname = usePathname();
  const [pageTitle, setPageTitle] = useState('');
  const [dictionary, setDictionary] = useState<any>({});

  useEffect(() => {
    async function loadDictionary() {
      try {
        const dict = await getDictionary(lang as 'en' | 'sq');
        setDictionary(dict);
        
        // Set page title based on current path
        if (pathname.includes('/dashboard')) {
          setPageTitle(dict.dashboard || 'Dashboard');
        } else if (pathname.includes('/bookings')) {
          setPageTitle(dict.bookings || 'Bookings');
        } else if (pathname.includes('/expenses')) {
          setPageTitle(dict.expenses || 'Expenses');
        } else if (pathname.includes('/revenue')) {
          setPageTitle(dict.finances || 'Finances');
        } else if (pathname.includes('/settings')) {
          setPageTitle(dict.settings || 'Settings');
        } else {
          setPageTitle(dict.villa_manager || 'Villa Manager');
        }
      } catch (error) {
        console.error('Failed to load dictionary:', error);
      }
    }
    loadDictionary();
  }, [pathname, lang]);
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Mobile layout (centered) */}
        <div className="md:hidden flex w-full items-center justify-between">
          {/* Left side - empty space for balance */}
          <div className="flex-1"></div>
          
          {/* Center - page title */}
          <div className="flex-1 text-center">
            <h1 className="text-xl font-semibold">{pageTitle}</h1>
          </div>
          
          {/* Right side - logo */}
          <div className="flex-1 flex justify-end">
            <Link href={`/${lang}/dashboard`} className="flex items-center">
              <Image 
                src="/images/favicon/android-chrome-192x192.png"
                alt="Villa Ime Logo"
                width={63}
                height={63}
                className="transition-all hover:opacity-80"
                priority
              />
            </Link>
          </div>
        </div>

        {/* Tablet and Desktop layout (left-aligned) */}
        <div className="hidden md:flex w-full items-center">
          {/* Left side - logo and title */}
          <div className="flex items-center gap-4">
            <Link href={`/${lang}/dashboard`} className="flex items-center">
              <Image 
                src="/images/favicon/android-chrome-192x192.png"
                alt="Villa Ime Logo"
                width={63}
                height={63}
                className="transition-all hover:opacity-80"
                priority
              />
            </Link>
            <h1 className="text-xl font-semibold">{pageTitle}</h1>
          </div>
          
          {/* Right side - space for future elements like notifications, user menu, etc. */}
          <div className="flex-1 flex justify-end items-center gap-4">
            {/* Space reserved for future elements */}
          </div>
        </div>
      </div>
    </header>
  );
}






