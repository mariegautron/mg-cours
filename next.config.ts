import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ces paquets chargent des fichiers (WASM, XSD, Schematron compilé) via import.meta.url :
  // ils doivent rester externes au bundle serveur pour résoudre leurs chemins.
  serverExternalPackages: [
    "@stafyniaksacha/facturx",
    "libxml2-wasm",
    "saxon-js",
    "pdf-lib",
    "@pdf-lib/fontkit",
  ],
};

export default nextConfig;
