import { createContext, useCallback, useContext, type ReactNode } from "react";
import { hasPermission, type AdminAccess } from "@/lib/permissions";

const AdminAccessContext = createContext<AdminAccess | null>(null);

export function AdminAccessProvider({
  access,
  children,
}: {
  access: AdminAccess;
  children: ReactNode;
}) {
  return (
    <AdminAccessContext.Provider value={access}>
      {children}
    </AdminAccessContext.Provider>
  );
}

/**
 * Outside the admin shell, checks allow the control so existing panel tests
 * keep rendering actions. The backend guard remains the authority.
 */
export function useCan() {
  const access = useContext(AdminAccessContext);
  return useCallback(
    (key: string) =>
      access ? hasPermission(access.permissions, key, access.superAdmin) : true,
    [access],
  );
}
