import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";

import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { ThemeProvider } from "@/components/theme-provider";
import { DENSITY_COOKIE, readDensity } from "@/lib/settings/density";
import { readTextSize, TEXT_SIZE_COOKIE } from "@/lib/settings/text-size";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const heading = Bricolage_Grotesque({
  variable: "--font-heading",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  applicationName: APP_NAME,
  description: APP_TAGLINE,
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const textSize = readTextSize(cookieStore.get(TEXT_SIZE_COOKIE)?.value);
  const density = readDensity(cookieStore.get(DENSITY_COOKIE)?.value);
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      data-text-size={textSize}
      data-density={density}
      className={`${sans.variable} ${heading.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
