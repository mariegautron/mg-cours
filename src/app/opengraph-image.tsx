import { ImageResponse } from "next/og";

/**
 * Image d'aperçu des liens partagés (Teams, e-mail) : le nom de l'appli et sa phrase, rien de
 * privé (ni nom d'étudiant·e, ni module). Même image pour l'espace étudiant·e et le lien de classe.
 */
export const alt = "Marelle : préparer, faire cours, corriger et suivre ses étudiant·es";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        background: "#0E0E11",
        color: "#EDEDF0",
      }}
    >
      <div style={{ fontSize: 140, fontWeight: 800, letterSpacing: "-4px", lineHeight: 1 }}>
        marelle
      </div>
      <div style={{ marginTop: 28, fontSize: 40, color: "#9A9AA6" }}>
        Préparer, faire cours, corriger et suivre ses étudiant·es
      </div>
      <div
        style={{ marginTop: 48, width: 160, height: 12, borderRadius: 6, background: "#B9A9FF" }}
      />
    </div>,
    size,
  );
}
