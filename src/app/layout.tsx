import type { Metadata } from "next";
import { DM_Sans, Inter, Source_Serif_4 } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const replySerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-reply-serif",
});

const replySans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-reply-sans",
});

export const metadata: Metadata = {
  title: "AIChatDeck",
  description: "Horizontal pages for long AI conversations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} ${replySerif.variable} ${replySans.variable} bg-[#FAFAFB] text-zinc-900 antialiased dark:bg-[#0A0A0C] dark:text-zinc-100`}
      >
        <ThemeProvider>
          {children}
          <Toaster position="bottom-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}