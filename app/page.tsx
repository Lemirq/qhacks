import Map from '@/components/Map';

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white dark:bg-gray-900 shadow-sm z-10 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Queen&apos;s University Campus Map
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          3D interactive campus view
        </p>
      </header>
      <main className="flex-1 relative">
        <Map />
      </main>
    </div>
  );
}
