import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "stdgentic",
  description:
    "A prompt lab with a full-terminal look. Runs locally with your own OpenRouter key.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // One theme: a dark terminal. There is no toggle.
      className={`dark ${mono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">
        <AppShell>{children}</AppShell>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
