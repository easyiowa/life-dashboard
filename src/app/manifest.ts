import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Call it a Day",
    short_name: "Call it a Day",
    description: "Unwind your context, dump your tasks, and claim your mental headspace.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f1",
    theme_color: "#F35600",
    icons: [
      {
        src: "/ciad.jpg",
        sizes: "any",
        type: "image/jpeg",
      },
    ],
  };
}
