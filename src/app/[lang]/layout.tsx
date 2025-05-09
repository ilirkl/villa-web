import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"; // If using dark mode toggle



// Optimize font loading by specifying only needed characters
const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  // Optional: specify only characters you need
  // variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Villa Management App",
  description: "Manage your villa rentals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider // Optional: for dark mode
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
