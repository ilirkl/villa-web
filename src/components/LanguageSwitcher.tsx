"use client";

import { usePathname, useRouter } from "next/navigation";
import Cookies from 'js-cookie';
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/dictionary";
import { useParams } from "next/navigation";

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

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    // Set cookie for the middleware
    Cookies.set('NEXT_LOCALE', newLocale, { path: '/' });
    // Reconstruct the path with the new locale
    router.replace(`/${newLocale}${restOfPath}`);
  };

  return (
    <div style={{ marginBottom: "1rem", fontSize: "12px" }}>
      <label htmlFor="language-select" style={{ marginRight: 8 }}>
        {dictionary?.language || "Language"}:
      </label>
      <select
        id="language-select"
        value={currentLocale}
        onChange={handleChange}
        style={{ fontSize: "12px" }}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>{lang.label}</option>
        ))}
      </select>
    </div>
  );
}
