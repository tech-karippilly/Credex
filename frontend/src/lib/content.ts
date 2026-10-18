import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  Code2, Layers, MonitorSmartphone, Workflow, Database, RefreshCcw, Compass, Cloud, Shield,
  Cpu, BarChart3, Smartphone, Globe, Settings, Briefcase, Users, Zap, Lock, Server, LineChart,
  type LucideIcon,
} from "lucide-react";
import { getSiteContent } from "./content.functions";

export const contentQuery = queryOptions({
  queryKey: ["site-content"],
  queryFn: () => getSiteContent(),
  staleTime: 60_000,
  // A rejected content load is deterministic for this request; retrying repeats the same failure.
  retry: false,
});

export function useContent() {
  return useSuspenseQuery(contentQuery).data;
}

export const ICONS: Record<string, LucideIcon> = {
  Code2, Layers, MonitorSmartphone, Workflow, Database, RefreshCcw, Compass, Cloud, Shield,
  Cpu, BarChart3, Smartphone, Globe, Settings, Briefcase, Users, Zap, Lock, Server, LineChart,
};

export function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Code2;
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
