"use client"; // Needs client hooks for path checking

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Home,
  CalendarDays,
  CreditCard,
  LineChart,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDictionary } from "@/lib/dictionary";
import { SidebarPropertySwitcher } from "./SidebarPropertySwitcher";

export function Sidebar() {
  const pathname = usePathname();
  const { lang } = useParams();
  const [dictionary, setDictionary] = useState<any>({});

  useEffect(() => {
    async function loadDictionary() {
      try {
        const dict = await getDictionary(lang as 'en' | 'sq');
        setDictionary(dict);
      } catch (error) {
        console.error('Failed to load dictionary:', error);
      }
    }
    loadDictionary();
  }, [lang]);

  // Add this function to check if a route is active
  const isActive = (href: string): boolean => {
    // Check if the current path starts with the href (to handle nested routes)
    return pathname.startsWith(`/${lang}${href}`);
  };

  const navItems = [
    { href: "/dashboard", label: dictionary.dashboard || "Dashboard", icon: Home },
    { href: "/bookings", label: dictionary.bookings || "Bookings", icon: CalendarDays },
    { href: "/expenses", label: dictionary.expenses || "Expenses", icon: CreditCard },
    { href: "/revenue", label: dictionary.revenue || "Revenue", icon: LineChart },
    { href: "/settings", label: dictionary.settings || "Settings", icon: Settings },
  ];

  return (
    <aside className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm px-4 py-2 border">
      <nav className="flex items-center justify-center gap-2">
        <TooltipProvider>
          {/* Property Switcher */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <SidebarPropertySwitcher dictionary={dictionary} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">{dictionary.switch_property || 'Switch Property'}</TooltipContent>
          </Tooltip>

          {/* Navigation Items */}
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={`/${lang}${item.href}`}
                  className={cn(
                    "flex items-center justify-center rounded-full p-4 transition-colors",
                    isActive(item.href)
                      ? "bg-[#ff5a5f]/10 text-[#ff5a5f]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <item.icon className="h-7 w-7" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>
    </aside>
  );
}
