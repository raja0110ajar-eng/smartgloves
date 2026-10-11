import { ImageResponse } from "next/og";

export const alt = "SmartGloves, penerjemah SIBI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0b0b0f",
          color: "#f2f2f5",
        }}
      >
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700 }}>SmartGloves</div>
        <div style={{ display: "flex", fontSize: 40, color: "#9a9aa8", marginTop: 24 }}>
          Sarung tangan pintar: isyarat SIBI menjadi teks dan suara
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#7c9cff", marginTop: 48 }}>
          smartgloves.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}