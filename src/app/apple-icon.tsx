import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #2A2520 0%, #4A4138 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia, serif",
          color: "#F4ECDF",
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 110,
            fontWeight: 300,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            display: "flex",
          }}
        >
          S
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            marginTop: 8,
            color: "#B5562B",
            display: "flex",
          }}
        >
          öndag
        </div>
      </div>
    ),
    { ...size }
  );
}
