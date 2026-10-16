import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pg", "sharp"],
  // La imagen base de la boleta se lee desde disco al generar cada boleta.
  outputFileTracingIncludes: { "/boleta/[code]/[number]/imagen": ["./public/brand/boleta.jpg"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
