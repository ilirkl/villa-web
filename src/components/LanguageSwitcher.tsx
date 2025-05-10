"use client";

import { usePathname, useRouter, useParams } from "next/navigation";
import Cookies from 'js-cookie';
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/dictionary";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlobeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const languages = [
  { code: "en", label: "English" },
  { code: "sq", label: "Shqip" },
];

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useParams();
  const [dictionary, setDictionary] = useState<any>(null);

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

  const currentLocale = pathname.split("/")[1];
  const restOfPath = pathname.replace(/^\/(en|sq)/, "");

  const handleChange = (newLocale: string) => {
    // Set cookie for the middleware
    Cookies.set('NEXT_LOCALE', newLocale, { path: '/' });
    // Reconstruct the path with the new locale
    router.replace(`/${newLocale}${restOfPath}`);
  };

  return (
    <div className="flex items-center gap-2 mb-4">
      <Select value={currentLocale} onValueChange={handleChange}>
        <SelectTrigger 
          className="w-[140px] h-8 text-sm border-[#FF5A5F]/20 hover:border-[#FF5A5F]/50 focus:border-[#FF5A5F]"
          style={{ 
            "--accent-color": "#FF5A5F" 
          } as React.CSSProperties}
        >
          <GlobeIcon className="mr-2 h-4 w-4 text-[#FF5A5F]" />
          <SelectValue placeholder={dictionary?.language || "Language"} />
        </SelectTrigger>
        <SelectContent className="min-w-[140px]">
          {languages.map((lang) => (
            <SelectItem 
              key={lang.code} 
              value={lang.code}
              className={cn(
                "cursor-pointer",
                currentLocale === lang.code && "text-[#FF5A5F] font-medium"
              )}
            >
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
