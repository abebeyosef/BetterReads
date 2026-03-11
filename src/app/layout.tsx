import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BetterReads",
  description: "A modern, social book tracking platform",
};

// Inline FOUC-prevention script: reads cookie → localStorage → default 'driftwood'
// and sets data-theme on <html> before first paint.
const themeScript = `
(function(){
  var t;
  try {
    var m = document.cookie.match(/betterreads-theme=([^;]+)/);
    t = m ? m[1] : localStorage.getItem('betterreads-theme');
  } catch(e) {}
  if (!t || !['driftwood','seasalt','linen','golden'].includes(t)) t = 'driftwood';
  document.documentElement.setAttribute('data-theme', t);
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.className} ${lora.variable}`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
