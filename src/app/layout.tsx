import type { Metadata } from "next";
import { Bricolage_Grotesque, Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ReducedMotionProvider } from "@/components/primitives/ReducedMotionProvider";
import { CornerNav } from "@/components/layout/CornerNav";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Abdullah Umar",
  description:
    "Software engineer at Veeam. Founder at Valkrix. Building both, on purpose.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${archivo.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ReducedMotionProvider>
          <CornerNav />
          {children}
        </ReducedMotionProvider>
      </body>
    </html>
  );
}
