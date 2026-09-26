import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dépôt des documents de module (10 Mo max, cf. bucket module-documents).
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
  // Ces paquets chargent des fichiers (WASM, XSD, Schematron compilé) via import.meta.url :
  // ils doivent rester externes au bundle serveur pour résoudre leurs chemins.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  serverExternalPackages: [
    "@stafyniaksacha/facturx",
    "libxml2-wasm",
    "saxon-js",
    "pdf-lib",
    "@pdf-lib/fontkit",
  ],
};

export default nextConfig;
