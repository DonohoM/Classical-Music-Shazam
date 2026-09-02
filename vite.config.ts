import { defineConfig } from "vite";

export default defineConfig({
  server: {
    // Mic access requires a secure context; localhost is exempt from HTTPS.
    host: true,
  },
});
