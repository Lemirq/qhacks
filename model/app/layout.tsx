import type { Metadata } from 'next';
import '../src/index.css';

export const metadata: Metadata = {
  title: 'Urban Planning 3D Building Modeler',
  description: 'Interactive 3D building designer for urban planning with Three.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
