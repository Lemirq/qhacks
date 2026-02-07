'use client';

import dynamic from 'next/dynamic';

// Dynamically import the App component with no SSR
// This is necessary because Three.js requires browser APIs
const App = dynamic(() => import('../src/App'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen w-screen bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading 3D Building Modeler...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <App />;
}
