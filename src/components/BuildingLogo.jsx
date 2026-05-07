export default function BuildingLogo({ size = 56, className = "" }) {
  const s = Number(size) || 56;

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="48" width="15" height="34" rx="3" fill="#A5F3FC" />
      <rect x="28" y="34" width="18" height="48" rx="3" fill="#06B6D4" />
      <rect x="50" y="19" width="20" height="63" rx="3" fill="#F8FAFC" />
      <rect x="73" y="40" width="14" height="42" rx="3" fill="#E0F2FE" />
      <path d="M50 19L70 30V82H50V19Z" fill="#E0F2FE" />
      <path d="M28 34L46 43V82H28V34Z" fill="#0891B2" />
      <path d="M50 19L62 25V82H50V19Z" fill="#14B8A6" />
      <path d="M73 40L87 48V82H73V40Z" fill="#BAE6FD" />
      <rect x="56" y="44" width="6" height="8" rx="1" fill="#0F172A" opacity=".75" />
      <rect x="56" y="57" width="6" height="8" rx="1" fill="#0F172A" opacity=".75" />
      <rect x="56" y="70" width="6" height="8" rx="1" fill="#0F172A" opacity=".75" />
      <path d="M7 82H90" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
      <path d="M19 48L28 34L50 19L73 40" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".85" />
    </svg>
  );
}
