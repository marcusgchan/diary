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
      {
        source: "/diaries/:diaryId/entries/:entryId",
        destination: "/diaries/:diaryId/entries/:entryId/map",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
