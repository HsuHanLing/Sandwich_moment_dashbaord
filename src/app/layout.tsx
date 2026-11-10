import type { Metadata } from "next";
import { LocaleProvider } from "@/contexts/LocaleContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moment Analytics",
  description: "AI Chat App analytics dashboard — session-based emotional interaction",
  icons: {
    icon: "/moment-logo.png",
    apple: "/moment-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="antialiased"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif' }}
      >
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
