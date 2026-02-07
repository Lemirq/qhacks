'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamic import with SSR disabled to avoid initialization issues
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900">
      <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
    </div>
  ),
});

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white dark:bg-gray-900 shadow-sm z-10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Queen&apos;s University Campus Map
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              3D interactive campus view
            </p>
          </div>
          <Link
            href="/editor"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Open 3D Building Editor
          </Link>
        </div>
      </header>
      <main className="flex-1 relative overflow-hidden">
        <Map />
      </main>
    </div>
  );
}
