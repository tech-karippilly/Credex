import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAccessProvider } from "./admin-access";
import { LeadsPanel } from "./leads-panel";
import type { Lead, LeadListResult, LeadSummary } from "@/lib/leads-api";

const api = vi.hoisted(() => ({
  list: vi.fn(),
  summary: vi.fn(),
  assignees: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateStage: vi.fn(),
  remove: vi.fn(),
  activities: vi.fn(),
  addActivity: vi.fn(),
  previewImport: vi.fn(),
  commitImport: vi.fn(),
  downloadTemplate: vi.fn(),
  export: vi.fn(),
}));

vi.mock("@/lib/leads-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/leads-api")>("@/lib/leads-api");
  return {
    ...actual,
    leadsApi: api,
  };
});

const lead: Lead = {
  id: "lead-1",
  companyName: "Acme Traders",
  contactName: "Priya Nair",
  phone: "+919876543210",
  alternatePhone: null,
  email: "priya@example.com",
  website: null,
  location: "Kochi",
  source: "REFERRAL",
  stage: "NEW",
  priority: "MEDIUM",
  assignedUserId: "user-1",
  assignedUserName: "Alex",
  assignedUserEmail: "alex@example.com",
  interestType: null,
  interestedModules: [],
  requestedFeatures: null,
  changeRequests: null,
  businessRequirements: null,
  estimatedBudget: null,
  expectedTimeline: null,
  decisionMaker: null,
  nextFollowUpAt: "2026-10-20",
  nextAction: "Call",
  notes: null,
  lastActivityAt: null,
  lastActivitySummary: null,
  lastActivityType: null,
  createdAt: "2026-10-15T00:00:00.000Z",
  updatedAt: "2026-10-15T00:00:00.000Z",
};

const listResult: LeadListResult = {
  items: [lead],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

const summary: LeadSummary = {
  total: 4,
  new: 2,
  contacted: 0,
  qualified: 1,
  demoScheduled: 1,
  demoCompleted: 0,
  proposal: 0,
  won: 0,
  lost: 0,
  onHold: 0,
  followUpsDueToday: 1,
  overdueFollowUps: 3,
  upcomingFollowUps: 0,
  assignedToMe: 1,
  byStage: [],
};

function renderPanel(permissions: string[] = [
  "leads.read",
  "leads.create",
  "leads.update",
  "leads.assign",
  "leads.delete",
  "leads.import",
  "leads.export",
]) {
  return render(
    <AdminAccessProvider access={{ superAdmin: false, permissions }}>
      <LeadsPanel />
    </AdminAccessProvider>,
  );
}

describe("LeadsPanel", () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset();
    api.list.mockResolvedValue(listResult);
    api.summary.mockResolvedValue(summary);
    api.assignees.mockResolvedValue([{ id: "user-1", name: "Alex", email: "alex@example.com" }]);
    api.get.mockResolvedValue(lead);
    api.activities.mockResolvedValue({
      items: [
        {
          id: "act-1",
          leadId: "lead-1",
          type: "CREATED",
          actorId: "admin",
          actorEmail: "admin@example.com",
          actorName: "Admin",
          summary: "Lead created",
          payload: null,
          createdAt: "2026-10-15T00:00:00.000Z",
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    api.create.mockResolvedValue(lead);
    api.updateStage.mockResolvedValue({ ...lead, stage: "CONTACTED" });
    api.addActivity.mockResolvedValue({
      id: "act-2",
      leadId: "lead-1",
      type: "NOTE",
      actorId: "admin",
      actorEmail: "admin@example.com",
      actorName: "Admin",
      summary: "Note added",
      payload: null,
      createdAt: "2026-10-15T01:00:00.000Z",
    });
  });

  it("renders dashboard metrics from the summary endpoint", async () => {
    renderPanel(["leads.read"]);
    expect(await screen.findByText("Total leads")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Overdue follow-ups")).toBeInTheDocument();
    expect(api.list).toHaveBeenCalled();
    expect(screen.queryByText("Add lead")).not.toBeInTheDocument();
    expect(screen.queryByText("Export")).not.toBeInTheDocument();
  });

  it("creates a lead and lists it", async () => {
    renderPanel();
    await screen.findByText("Acme Traders");
    fireEvent.click(screen.getByRole("button", { name: /add lead/i }));
    fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Beta Mills" } });
    fireEvent.change(screen.getByLabelText("Contact name"), { target: { value: "Arun" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+919811111111" } });
    fireEvent.change(screen.getByLabelText("Assigned user"), { target: { value: "user-1" } });
    fireEvent.click(screen.getByRole("button", { name: /create lead/i }));
    await waitFor(() => expect(api.create).toHaveBeenCalled());
    expect(api.create.mock.calls[0][0]).toMatchObject({
      companyName: "Beta Mills",
      assignedUserId: "user-1",
    });
  });

  it("updates stage from the list", async () => {
    renderPanel();
    const select = await screen.findByLabelText("Stage for Acme Traders");
    fireEvent.change(select, { target: { value: "CONTACTED" } });
    await waitFor(() => expect(api.updateStage).toHaveBeenCalledWith("lead-1", "CONTACTED"));
  });

  it("shows the activity timeline and records a note", async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Acme Traders" }));
    expect(await screen.findByText("Lead created")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Called the buyer" } });
    fireEvent.click(screen.getByRole("button", { name: /save activity/i }));
    await waitFor(() => expect(api.addActivity).toHaveBeenCalled());
  });

  it("previews a visiting card locally without uploading", async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: /add lead/i }));
    const file = new File(["fake"], "card.png", { type: "image/png" });
    const input = screen.getByLabelText(/choose image/i);
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByAltText("Visiting card preview")).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /remove preview/i }));
    expect(screen.queryByAltText("Visiting card preview")).not.toBeInTheDocument();
  });

  it("rejects .xls files in the import wizard", async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: /import/i }));
    const input = screen.getByLabelText(/choose file/i);
    const file = new File(["data"], "leads.xls", { type: "application/vnd.ms-excel" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByRole("status")).toHaveTextContent(/Excel 97-2003/i);
    expect(api.previewImport).not.toHaveBeenCalled();
  });
});
