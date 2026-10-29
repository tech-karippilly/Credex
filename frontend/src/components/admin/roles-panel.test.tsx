import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ManagedRoleDetail } from "@/lib/roles-api";
import { RolesPanel } from "./roles-panel";

const { list, catalogue, get } = vi.hoisted(() => ({
  list: vi.fn(),
  catalogue: vi.fn(),
  get: vi.fn(),
}));

vi.mock("@/lib/roles-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/roles-api")>(
    "@/lib/roles-api",
  );
  return {
    ...actual,
    rolesApi: {
      ...actual.rolesApi,
      list,
      catalogue,
      get,
    },
  };
});

function role(
  overrides: Partial<ManagedRoleDetail> & Pick<ManagedRoleDetail, "id" | "name">,
): ManagedRoleDetail {
  return {
    key: overrides.name.toLowerCase().replace(/\s+/g, "-"),
    description: `${overrides.name} description`,
    systemManaged: false,
    userCount: 0,
    permissionCount: 0,
    ...overrides,
  };
}

const roles: ManagedRoleDetail[] = [
  role({
    id: "1",
    name: "Finance Admin",
    key: "finance-admin",
    description: "Manage expenses and vouchers",
    userCount: 2,
    permissionCount: 5,
  }),
  role({
    id: "2",
    name: "Content Editor",
    key: "content-editor",
    description: "Edit website services and careers",
    userCount: 1,
    permissionCount: 3,
  }),
  role({
    id: "3",
    name: "Support Agent",
    key: "support-agent",
    description: "Handle enquiries and leads",
    systemManaged: true,
    userCount: 4,
    permissionCount: 2,
  }),
];

describe("RolesPanel search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue(roles);
    catalogue.mockResolvedValue([]);
    get.mockImplementation(async (id: string) => {
      const found = roles.find((entry) => entry.id === id);
      if (!found) throw new Error("missing");
      return { ...found, permissions: [] };
    });
  });

  it("filters roles by full name", async () => {
    render(<RolesPanel />);

    expect(await screen.findByText("Finance Admin")).toBeInTheDocument();
    expect(screen.getByText("Content Editor")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search roles"), {
      target: { value: "Finance Admin" },
    });

    expect(screen.getByText("Finance Admin")).toBeInTheDocument();
    expect(screen.queryByText("Content Editor")).not.toBeInTheDocument();
    expect(screen.queryByText("Support Agent")).not.toBeInTheDocument();
  });

  it("filters by partial name, key, or description and ignores case and surrounding spaces", async () => {
    render(<RolesPanel />);
    await screen.findByText("Finance Admin");

    fireEvent.change(screen.getByLabelText("Search roles"), {
      target: { value: "  CONTENT  " },
    });
    expect(screen.getByText("Content Editor")).toBeInTheDocument();
    expect(screen.queryByText("Finance Admin")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search roles"), {
      target: { value: "support-agent" },
    });
    expect(screen.getByText("Support Agent")).toBeInTheDocument();
    expect(screen.queryByText("Content Editor")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search roles"), {
      target: { value: "vouchers" },
    });
    expect(screen.getByText("Finance Admin")).toBeInTheDocument();
    expect(screen.queryByText("Support Agent")).not.toBeInTheDocument();
  });

  it("shows a search empty state and restores the full list when cleared", async () => {
    render(<RolesPanel />);
    await screen.findByText("Finance Admin");

    fireEvent.change(screen.getByLabelText("Search roles"), {
      target: { value: "zzz-no-match" },
    });
    expect(
      screen.getByText("No roles found matching your search."),
    ).toBeInTheDocument();
    expect(screen.queryByText("No roles yet.")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search roles"), {
      target: { value: "" },
    });
    expect(screen.getByText("Finance Admin")).toBeInTheDocument();
    expect(screen.getByText("Content Editor")).toBeInTheDocument();
    expect(screen.getByText("Support Agent")).toBeInTheDocument();
  });

  it("keeps the existing empty list message when there are no roles", async () => {
    list.mockResolvedValue([]);
    render(<RolesPanel />);

    expect(await screen.findByText("No roles yet.")).toBeInTheDocument();
    expect(
      screen.queryByText("No roles found matching your search."),
    ).not.toBeInTheDocument();
  });

  it("still opens a role for editing after filtering", async () => {
    render(<RolesPanel />);
    await screen.findByText("Finance Admin");

    fireEvent.change(screen.getByLabelText("Search roles"), {
      target: { value: "finance" },
    });
    fireEvent.click(screen.getByText("Finance Admin"));

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith("1");
    });
    expect(screen.getByLabelText("Name")).toHaveValue("Finance Admin");
  });
});
