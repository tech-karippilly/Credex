import { createContext, useContext, type ReactNode } from "react";
import type { ApiCapabilities } from "@/lib/api-capabilities";
import { LEGACY_API_CAPABILITIES } from "@/lib/api-capabilities";

const ApiCapabilitiesContext = createContext<ApiCapabilities>(LEGACY_API_CAPABILITIES);

export function ApiCapabilitiesProvider({
  capabilities,
  children,
}: {
  capabilities: ApiCapabilities;
  children: ReactNode;
}) {
  return (
    <ApiCapabilitiesContext.Provider value={capabilities}>
      {children}
    </ApiCapabilitiesContext.Provider>
  );
}

export function useApiCapabilities(): ApiCapabilities {
  return useContext(ApiCapabilitiesContext);
}
