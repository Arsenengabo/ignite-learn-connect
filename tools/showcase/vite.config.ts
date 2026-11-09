import { defineConfig } from "vite"; import react from "@vitejs/plugin-react"; import path from "path";
const repo = path.resolve(__dirname, "../..");
export default defineConfig({ root: path.join(repo, "tools/showcase"), publicDir: path.join(repo, "public"), plugins: [react()], css: { postcss: repo },
  resolve: { alias: [{ find: "@/integrations/supabase/client", replacement: path.join(repo, "tools/showcase/mockSupabase.ts") }, { find: "@", replacement: path.join(repo, "src") }] },
  server: { fs: { allow: [repo] } } });
