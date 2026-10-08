import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type SiteSettings = {
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  instagram: string;
  hero_title: string;
  hero_text: string;
  hero_image: string;
  about_image: string;
};

export type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
export type JobRow = Database["public"]["Tables"]["jobs"]["Row"];

export const DEFAULT_SETTINGS: SiteSettings = {
  email: "hr@credexfin.com",
  phone: "+91 80785 99537",
  location: "Irinjalakuda, Kerala, India",
  linkedin: "",
  instagram: "",
  hero_title: "Technology That Solves Real Business Problems.",
  hero_text:
    "Credex builds practical, scalable technology solutions that help businesses simplify operations, automate processes, improve efficiency, and create real business value.",
  hero_image: "",
  about_image: "",
};

export const getSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const [s, sv, j] = await Promise.all([
    sb.from("site_settings").select("data").eq("id", 1).maybeSingle(),
    sb.from("services").select("*").eq("published", true).order("sort"),
    sb.from("jobs").select("*").eq("published", true).order("sort"),
  ]);
  if (s.error || sv.error || j.error) console.error(s.error ?? sv.error ?? j.error);
  return {
    settings: { ...DEFAULT_SETTINGS, ...((s.data?.data as Partial<SiteSettings>) ?? {}) },
    services: sv.data ?? [],
    jobs: j.data ?? [],
  };
});
