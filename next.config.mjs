/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

export default nextConfig;
