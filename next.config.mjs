/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        // Keep pdfkit (and its AFM font data) outside the bundle so it can
        // resolve its runtime data files from node_modules at runtime.
        config.externals.push("pdfkit");
      }
    }
    // face-api is loaded at runtime via a <script> tag (see FaceCapture), so it
    // is intentionally NOT bundled by webpack. The optional encoding/fs node
    // builtins are stubbed just in case anything pulls them in transitively.
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      encoding: false,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;
