import { ImageResponse } from "next/og";

export const contentType = "image/png";

export function generateImageMetadata() {
  return [
    { id: "small", size: { width: 32, height: 32 } },
    { id: "medium", size: { width: 192, height: 192 } },
    { id: "large", size: { width: 512, height: 512 } },
  ];
}

export default function Icon({ id }: { id: string }) {
  const sizes: Record<string, { width: number; height: number; fontSize: number; subSize: number; subMargin: number }> = {
    small: { width: 32, height: 32, fontSize: 22, subSize: 0, subMargin: 0 },
    medium: { width: 192, height: 192, fontSize: 120, subSize: 18, subMargin: 8 },
    large: { width: 512, height: 512, fontSize: 320, subSize: 48, subMargin: 24 },
  };
  const cfg = sizes[id] ?? sizes.small;

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
        }}
      >
        <div
          style={{
            fontSize: cfg.fontSize,
            fontWeight: 300,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            display: "flex",
          }}
        >
          S
        </div>
        {cfg.subSize > 0 && (
          <div
            style={{
              fontSize: cfg.subSize,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginTop: cfg.subMargin,
              color: "#B5562B",
              display: "flex",
            }}
          >
            öndag
          </div>
        )}
      </div>
    ),
    { width: cfg.width, height: cfg.height }
  );
}
