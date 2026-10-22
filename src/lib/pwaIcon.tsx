/** Blason simplifie pour les icones PWA/favicon (JSX compatible next/og
 * ImageResponse - pas de CSS externe, styles inline uniquement). Memes
 * couleurs que src/components/brand/Crest.tsx mais en div/texte pur, cette
 * API de rendu n'acceptant pas de SVG avec variables CSS. */
export function blasonIcone(taille: number) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0B1B38",
        border: `${Math.max(2, Math.round(taille * 0.025))}px solid #C99B2E`,
        borderRadius: "50%",
      }}
    >
      <span
        style={{
          color: "#E9CB7C",
          fontSize: taille * 0.28,
          fontWeight: 700,
          letterSpacing: taille * 0.02,
          fontFamily: "Georgia, serif",
        }}
      >
        CPK
      </span>
    </div>
  );
}
