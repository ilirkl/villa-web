"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Database } from "@/lib/database.types";
import { getDictionary } from "@/lib/dictionary";

export function Header() {
  const [companyName, setCompanyName] = useState<string | null>(null);
  const { lang } = useParams();
  const [dictionary, setDictionary] = useState<any>({});
  
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
          setCompanyName(dictionary.villa_manager || "Villa Manager"); // Default if error
        } else {
          setCompanyName(data.company_name);
        }
      } else {
        setCompanyName(dictionary.villa_manager || "Villa Manager"); // Default if no user
      }
    };

    fetchCompanyName();
  }, [supabase, dictionary]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <div className="flex-shrink-0">
        <div className="hidden sm:block w-10"></div>
      </div>

      <div className="flex-grow text-center">
        <h1 className="text-xl font-semibold">
          {companyName || dictionary.villa_manager || "Villa Manager"}
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
