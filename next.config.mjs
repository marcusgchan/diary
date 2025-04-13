/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  redirects() {
    return [
      {
        source: "/",
        destination: "/diaries",
        permanent: true,
      },
      {
        source: "/diaries/:diaryId/entries/:entryId",
        destination: "/diaries/:diaryId/entries/:entryId/posts",
        permanent: true,
      },
    ];
  },
  // https://github.com/baselime/node-opentelemetry/issues/2
  // https://github.com/vercel/next.js/discussions/76247
  webpack: (
    config,
    { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack },
  ) => {
    if (isServer) {
      config.ignoreWarnings = [{ module: /opentelemetry/ }];
    }
    return config;
  },
};

export default nextConfig;
