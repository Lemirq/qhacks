import Map from '@/components/Map';

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white dark:bg-gray-900 shadow-sm z-10 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Mapbox GL + Next.js
        </h1>
      </header>
      <main className="flex-1 relative">
        <Map
          initialCenter={[-76.4860, 44.2312]}
          initialZoom={13}
          style="mapbox://styles/mapbox/streets-v12"
        />
      </main>
    </div>
  );
}
