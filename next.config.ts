import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Application entierement dynamique (session + base de donnees sur
     chaque page) : pas de benefice au prerendering/cache statique, et ce
     mode experimental exige des limites <Suspense> autour de cookies()/
     searchParams() sur toutes les pages. Desactive volontairement. */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
