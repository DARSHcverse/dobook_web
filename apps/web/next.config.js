/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  reactStrictMode: true,
  // Lint runs as its own step before `next build` (package.json) using
  // eslint.config.mjs; skip Next's duplicate pass.
  eslint: { ignoreDuringBuilds: true },
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  async headers() {
    return [
      {
        // DENY framing everywhere except the embeddable customer pages
        // (/book/*, /enquiry/*); middleware's CSP frame-ancestors mirrors this.
        source: "/((?!book/|enquiry/).*)",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
