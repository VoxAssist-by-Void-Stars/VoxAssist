import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "VoxAssist — Knowledge Assistant",
  description:
    "Ask your vault, cite every claim, draft grounded plans. Personal-KB RAG with friend-scope sharing.",
  applicationName: "VoxAssist",
  openGraph: {
    title: "VoxAssist — Knowledge Assistant",
    description:
      "Retrieval-augmented ask + plan over your notes. Grounded answers with citations; friend scope respects shared-only notes.",
    type: "website",
    siteName: "VoxAssist",
  },
  twitter: {
    card: "summary",
    title: "VoxAssist — Knowledge Assistant",
    description:
      "Ask your vault, cite every claim, draft grounded plans.",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`dark ${geistSans.variable} ${geistMono.variable}`}
        suppressHydrationWarning
      >
        <body className="bg-background font-sans antialiased">
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            {children}
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
