import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Söndag",
    short_name: "Söndag",
    description: "Veckomeny, skafferi och inköpslista för familjen",
    start_url: "/vecka",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4ECDF",
    theme_color: "#2A2520",
    lang: "sv",
    categories: ["food", "lifestyle", "productivity"],
    icons: [
      { src: "/icon/medium", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/large", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/large", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
