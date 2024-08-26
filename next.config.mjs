/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  redirects() {
    return [
      {
        source: "/",
        destination: "/diaries",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
