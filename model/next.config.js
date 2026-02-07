/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React strict mode for Three.js compatibility
  reactStrictMode: false,

  // Optimize for client-side rendering
  webpack: (config) => {
    // Handle GLSL shaders
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: 'asset/source',
    });

    // Suppress warnings for certain modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    return config;
  },

  // Transpile Three.js and R3F packages
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
};

module.exports = nextConfig;
