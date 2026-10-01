import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AuthProvider } from "@/components/AuthProvider";
import { CursorCabeca } from "@/components/CursorCabeca";
import "./globals.css";

export const metadata: Metadata = {
  title: "Controle de Dívidas",
  description: "Gerencie quem está devendo e receba via PIX",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full text-zinc-200">
        <CursorCabeca />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
