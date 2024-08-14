/** @type {import('next').NextConfig} */
const nextConfig = {
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
