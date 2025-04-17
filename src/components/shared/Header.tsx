"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { PanelLeft } from "lucide-react"

// ... mobileNavItems

export function Header() {
  return (
    // Use justify-between to push items to edges
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">

      {/* Left Slot (e.g., Mobile Menu Button) */}
      <div className="flex-shrink-0"> {/* Prevents shrinking */}
         {/* Example Mobile Menu - Shown only on mobile */}
         <div className="sm:hidden">
             <Sheet>
               
               <SheetContent side="left" className="sm:max-w-xs">
                  {/* Mobile Nav Here */}
               </SheetContent>
             </Sheet>
         </div>
         {/* You might have a logo or back button here on desktop */}
         <div className="hidden sm:block w-10"> {/* Placeholder width */}
         </div>
      </div>

      {/* Title - Grows to fill space, text centered within */}
      <div className="flex-grow text-center">
      <h1 className="text-xl font-semibold">
          Villa Manager
        </h1>
      </div>

      {/* Right Slot (e.g., User Menu or Actions) */}
      <div className="flex-shrink-0"> {/* Prevents shrinking */}
         {/* Ensure this takes up roughly the same space as the left slot for visual balance */}
         {/* Example: Invisible placeholder on mobile to balance menu button */}
         <div className="sm:hidden w-8 h-8"></div> {/* Match button size */}

         {/* User menu or other elements could go here for desktop */}
         <div className="hidden sm:block w-10"> {/* Placeholder width */}
            {/* Desktop User Menu etc. */}
         </div>
      </div>
    </header>
  );
}