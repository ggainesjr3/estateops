/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@estateops/shared'],
  output: 'standalone',
  webpack: (config, { dev, isServer }) => {
    // In dev, use deterministic ("named") module/chunk ids so a given logical
    // chunk keeps a stable URL across recompiles. Hash-based ids change on
    // every edit, which is what leaves the browser requesting chunk URLs that
    // no longer exist -> ChunkLoadError. Stable names mean the same URL always
    // resolves to freshly compiled code.
    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'named',
        chunkIds: 'named',
      };
      config.output = {
        ...config.output,
        chunkFilename: 'static/chunks/[name].js',
      };
    }
    return config;
  },
};

export default nextConfig;
