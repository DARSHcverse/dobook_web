import "@/index.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/App.css";
import ClientShell from "@/app/ClientShell";
import SpeedInsightsClient from "@/components/app/SpeedInsightsClient";
import ThemeModeSync from "@/components/app/ThemeModeSync";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata = {
  title: "DoBook",
  description: "DoBook web app",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body>
        <TooltipProvider>
          <ClientShell>{children}</ClientShell>
          <Toaster />
        </TooltipProvider>
        <ThemeModeSync />
        <SpeedInsightsClient />
      </body>
    </html>
  );
}
