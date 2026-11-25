import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "YETAF HOLDING | Directive Follow-up System · Report Follow-up Center",
  description:
    "Modern Directive Follow-up System and Report Follow-up Center for Yetaf Holding Limited — AI summarization, multi-tasking, contextual chat, SLA enforcement, and action plan tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans min-h-screen bg-background text-foreground transition-colors duration-150">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
