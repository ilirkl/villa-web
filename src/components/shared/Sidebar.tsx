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

  const navItems = [
    { href: "/dashboard", label: dictionary.dashboard || "Dashboard", icon: Home },
    { href: "/bookings", label: dictionary.bookings || "Bookings", icon: CalendarDays },
    { href: "/expenses", label: dictionary.expenses || "Expenses", icon: CreditCard },
    { href: "/revenue", label: dictionary.revenue || "Revenue", icon: LineChart },
    { href: "/settings", label: dictionary.settings || "Settings", icon: Settings },
  ];

  return (
    <aside className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background sm:border-t">
      <nav className="flex items-center justify-around px-2 py-3">
        <TooltipProvider>
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-lg p-2 text-xs transition-colors",
                    pathname === item.href
                      ? "text-[#ff5a5f]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="h-6 w-6" />
                  <span>{item.label}</span>
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
