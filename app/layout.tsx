import type { Metadata } from "next";
import { Archivo, Lora, Playfair_Display } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
  variable: "--font-archivo",
});

const lora = Lora({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-lora",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KingsView — Urban Planning for Kingston",
  description: "3D urban planning tool for the City of Kingston. Design buildings, simulate construction timelines, and measure environmental impact before breaking ground.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${lora.variable} ${playfair.variable} antialiased`}
      >
        {children}
        <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js" async></script>
      </body>
    </html>
  );
}
