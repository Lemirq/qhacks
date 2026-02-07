import MapWithMarkers from '@/components/MapWithMarkers';

export default function ExamplePage() {
  const sampleMarkers = [
    {
      id: '1',
      coordinates: [-76.4860, 44.2312] as [number, number],
      title: 'Downtown Kingston',
      description: 'City Hall and Market Square area',
    },
    {
      id: '2',
      coordinates: [-76.5197, 44.2253] as [number, number],
      title: 'Fort Henry',
      description: 'Historic military fortification',
    },
    {
      id: '3',
      coordinates: [-76.4591, 44.2284] as [number, number],
      title: "Queen's University",
      description: 'Historic university campus',
    },
  ];

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white dark:bg-gray-900 shadow-sm z-10 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Map with Markers Example
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Click on markers to see popups
        </p>
      </header>
      <main className="flex-1 relative">
        <MapWithMarkers
          initialCenter={[-76.4860, 44.2312]}
          initialZoom={13}
          style="mapbox://styles/mapbox/streets-v12"
          markers={sampleMarkers}
        />
      </main>
    </div>
  );
}
