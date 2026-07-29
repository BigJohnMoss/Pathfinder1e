const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** @type {import("next").NextConfig} */
const nextConfig = {
  basePath,
  output: basePath ? "export" : undefined,
  trailingSlash: Boolean(basePath),
};

export default nextConfig;
