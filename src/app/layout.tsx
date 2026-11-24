import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MobileBar, Sidebar } from "@/components/shell/Sidebar";
import { SplashScreen } from "@/components/shell/SplashScreen";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s · DrillSim",
    default: "DrillSim · Drilling Engineering Simulator",
  },
  description:
    "Interactive drilling engineering simulations: live rig simulator, well control kill sheets, hydraulics, trajectory, torque & drag, casing design, pore pressure, cementing and more.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0e" },
    { media: "(prefers-color-scheme: light)", color: "#f4f4f1" },
  ],
};

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t="dark"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <SplashScreen />
        <div className="flex min-h-dvh">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileBar />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-line px-5 py-5 print:hidden text-[12px] text-ink-3 sm:px-8">
              DrillSim is an educational engineering tool. Results use simplified industry models
              and representative data; verify against company standards before operational use.
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
