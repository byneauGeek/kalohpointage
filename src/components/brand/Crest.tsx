/**
 * Blason du Collège Privé Kaloh — monogramme vectoriel (aucun fichier logo
 * fourni), dans l'esprit d'un sceau collégial classique : anneaux concentriques
 * or sur fond bleu nuit, monogramme "CPK" et un livre ouvert stylisé.
 */
export function Crest({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Blason du Collège Privé Kaloh"
    >
      <circle cx="32" cy="32" r="31" fill="var(--color-navy-900)" stroke="var(--color-gold-500)" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-gold-400)" strokeWidth="1" opacity="0.6" />
      <path
        d="M20 25c4-3 8-3 12 0c4-3 8-3 12 0v14c-4-3-8-3-12 0c-4-3-8-3-12 0z"
        fill="none"
        stroke="var(--color-gold-400)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <line x1="32" y1="25" x2="32" y2="39" stroke="var(--color-gold-400)" strokeWidth="1.2" />
      <text
        x="32"
        y="20"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="7"
        letterSpacing="1"
        fill="var(--color-gold-300)"
      >
        C P K
      </text>
    </svg>
  );
}
