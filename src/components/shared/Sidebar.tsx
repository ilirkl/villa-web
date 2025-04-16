"use client"; // Needs client hooks for path checking

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Settings, // Example icon
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/expenses", label: "Expenses", icon: CreditCard },
  { href: "/revenue", label: "Revenue", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

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
