/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@ramyas-jeweller/shared-types",
    "@ramyas-jeweller/shared-validation",
    "@ramyas-jeweller/shared-constants"
  ]
};

export default nextConfig;
