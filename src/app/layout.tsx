import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VoxAssist",
  description: "Personal-KB RAG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
