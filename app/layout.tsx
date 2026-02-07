import type { Metadata } from "next";
import { Archivo, Lora } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Kingston Municipal Planning Authority",
  description: "Geospatial planning and traffic simulation platform for Kingston",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${lora.variable} antialiased`}
      >
        {children}
        <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js" async></script>
      </body>
    </html>
  );
}
