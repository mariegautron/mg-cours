import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Ces paquets chargent des fichiers (WASM, XSD, Schematron compilé) via import.meta.url :
  // ils doivent rester externes au bundle serveur pour résoudre leurs chemins.
  async headers() {
    return [
      {
        // Passation d'un QCM : le jeton est dans l'URL, il ne doit fuir ni par Referer ni par un cache.
        source: "/q/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
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
  // Les fiches PDF (4 Mo max) transitent par une Server Action de lecture : le défaut est 1 Mo.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  serverExternalPackages: [
    "@stafyniaksacha/facturx",
    "libxml2-wasm",
    "saxon-js",
    "pdf-lib",
    "@pdf-lib/fontkit",
  ],
};

export default nextConfig;
