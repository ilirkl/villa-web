"use client";

import { createBrowserClient } from "@supabase/ssr"; // Import createBrowserClient
import { useEffect, useState } from "react";
import { Database } from "@/lib/database.types";

export function Header() {
  const [companyName, setCompanyName] = useState<string | null>(null);
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchCompanyName = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("company_name")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching company name:", error);
          setCompanyName("Villa Manager"); // Default if error
        } else {
          setCompanyName(data.company_name);
        }
      } else {
        setCompanyName("Villa Manager"); // Default if no user
      }
    };

    fetchCompanyName();
  }, [supabase]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <div className="flex-shrink-0">
        
        <div className="hidden sm:block w-10"></div>
      </div>

      <div className="flex-grow text-center">
        <h1 className="text-xl font-semibold">
          {companyName || "Villa Manager"}
        </h1>
      </div>

      <div className="flex-shrink-0">
        <div className="sm:hidden w-8 h-8"></div>
        <div className="hidden sm:block w-10">
          {/* Desktop User Menu etc. */}
        </div>
      </div>
    </header>
  );
}
