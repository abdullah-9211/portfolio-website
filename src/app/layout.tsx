import type { Metadata, Viewport } from "next";
import { Cormorant, Zen_Kaku_Gothic_New, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ReducedMotionProvider } from "@/components/primitives/ReducedMotionProvider";
import { ScrollProvider } from "@/campaign/scroll/ScrollProvider";

const cormorant = Cormorant({
  variable: "--font-cormorant",
  subsets: ["latin"],
  display: "swap",
});

const zen = Zen_Kaku_Gothic_New({
  variable: "--font-zen",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Abdullah Umar",
  description:
    "Backend engineer at Veeam. Founder at Valkrix. The story so far, told as a campaign you can play.",
};

export const viewport: Viewport = {
  themeColor: "#070c14",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cormorant.variable} ${zen.variable} ${jetbrainsMono.variable}`}>
      <body>
        <noscript>
          {/* Without scripting nothing can pin or cue, so lay every scene out as plain reading. */}
          <style>{`.act{height:auto!important}.act-stage{position:static!important;height:auto!important;overflow:visible!important}.cue{position:static!important;opacity:1!important;visibility:visible!important}.vista-stage{position:relative!important;height:100svh}.game,.minimap,.hud,.vista-night,.vista-scan,.vista-banner{display:none!important}.ctitle-stage{--in:1;position:relative!important;padding-block:6rem}.policy-diagram{--a:1;--b:1}.cutscene-stage{--hit:1;--glow:1;position:relative!important;padding-block:4rem}.cutscene-body{position:static!important}.cutscene-bar{display:none}.rail-stage{position:static!important;overflow-x:auto}.map-marker{opacity:1!important}`}</style>
        </noscript>
        <ReducedMotionProvider>
          <ScrollProvider>{children}</ScrollProvider>
        </ReducedMotionProvider>
      </body>
    </html>
  );
}
