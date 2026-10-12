import { LOGO_LEBAR, LOGO_NAVY, LOGO_TERAKOTA, LOGO_TINGGI } from "@/lib/logoPath";

type Props = { tinggi?: number; judul?: string; className?: string };

export default function Logo({ tinggi = 36, judul, className }: Props) {
  const lebar = Math.round((LOGO_LEBAR / LOGO_TINGGI) * tinggi);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${LOGO_LEBAR} ${LOGO_TINGGI}`}
      width={lebar}
      height={tinggi}
      className={className}
      role={judul ? "img" : undefined}
      aria-label={judul}
      aria-hidden={judul ? undefined : true}
      focusable="false"
    >
      <path
        fillRule="evenodd"
        d={LOGO_TERAKOTA}
        style={{ fill: "var(--logo-terakota, #BF5E3F)" }}
      />
      <path fillRule="evenodd" d={LOGO_NAVY} style={{ fill: "var(--logo-navy, #123250)" }} />
    </svg>
  );
}