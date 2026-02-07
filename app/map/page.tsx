import Link from 'next/link';
import ThreeMap from '@/components/ThreeMap';

export default function MapPage() {
  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white dark:bg-gray-900 shadow-sm z-10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-2xl font-bold text-gray-900 dark:text-white hover:opacity-80 transition-opacity">
              KingsView
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              3D Kingston city view
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
      <main className="flex-1 relative">
        <ThreeMap />
      </main>
    </div>
  );
}
