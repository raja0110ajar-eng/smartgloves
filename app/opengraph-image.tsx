import { ImageResponse } from "next/og";
import { LOGO_LEBAR, LOGO_NAVY, LOGO_TERAKOTA, LOGO_TINGGI } from "@/lib/logoPath";

export const alt = "SmartGloves oleh Karsa Pandiga";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const tinggi = 440;
  const lebar = Math.round((LOGO_LEBAR / LOGO_TINGGI) * tinggi);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 96px",
          background: "#F3F6FA",
          color: "#123250",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 700, letterSpacing: -2 }}>
            SmartGloves
          </div>
          <div style={{ display: "flex", fontSize: 38, color: "#52607A", marginTop: 20, maxWidth: 620 }}>
            Isyarat tangan jadi teks dan suara.
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#A8442B", marginTop: 44, fontWeight: 700 }}>
            Karsa Pandiga
          </div>
        </div>
        <svg width={lebar} height={tinggi} viewBox={`0 0 ${LOGO_LEBAR} ${LOGO_TINGGI}`}>
          <path d={LOGO_TERAKOTA} fill="#BF5E3F" fillRule="evenodd" />
          <path d={LOGO_NAVY} fill="#123250" fillRule="evenodd" />
        </svg>
      </div>
    ),
    { ...size }
  );
}