import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmployeeDetail, EmployeePayload } from "@/lib/employees-api";
import { EmployeesPanel } from "./employees-panel";

const { list, summary, options, setup, create } = vi.hoisted(() => ({
  list: vi.fn(),
  summary: vi.fn(),
  options: vi.fn(),
  setup: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/employees-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/employees-api")>("@/lib/employees-api");
  return {
    ...actual,
    employeesApi: {
      list,
      summary,
      options,
      setup,
      create,
      get: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      uploadDocument: vi.fn(),
      deleteDocument: vi.fn(),
    },
  };
});

const employee: EmployeeDetail = {
  id: "emp-1",
  employeeCode: "NF-0001",
  fullName: "Ada Lovelace",
  email: "ada@neuraforge.ai",
  phone: "9876543210",
  department: "Engineering",
  designation: "Engineer",
  workLocation: "Irinjalakuda",
  employmentType: "full_time",
  joiningDate: "2026-10-01",
  status: "onboarding",
  deviceUserId: null,
  reportingManager: null,
  dateOfBirth: null,
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  bankName: "",
  ifsc: "",
  bankAccountName: "",
  bankAccountNumber: "",
  photo: null,
  idProof: null,
  pan: null,
  bankProof: null,
  offerLetter: null,
  createdAt: "2026-10-31T00:00:00.000Z",
  updatedAt: "2026-10-31T00:00:00.000Z",
};

describe("EmployeesPanel", () => {
  beforeEach(() => {
    list.mockReset();
    summary.mockReset();
    options.mockReset();
    setup.mockReset();
    create.mockReset();
    summary.mockResolvedValue({ onboarding: 1, active: 0, exited: 0, total: 1 });
    options.mockResolvedValue([]);
    setup.mockResolvedValue({
      departments: [
        { id: "dep-1", name: "Marketing" },
        { id: "dep-2", name: "Support" },
        { id: "dep-3", name: "QA" },
      ],
      designations: [{ id: "des-1", name: "Engineer" }],
    });
    list.mockResolvedValue({
      items: [employee],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it("lists Neuraforge employees and the onboarding count", async () => {
    render(<EmployeesPanel />);

    expect(await screen.findByText("NF-0001")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("1 October 2026")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Employee Management" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Onboarding/ })).toHaveTextContent("1");
  });

  it("adds an employee without sending a status", async () => {
    create.mockResolvedValue({
      ...employee,
      id: "emp-2",
      employeeCode: "NF-0002",
      fullName: "Grace Hopper",
    });
    render(<EmployeesPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Add employee" }));
    expect(await screen.findByRole("option", { name: "Marketing" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Grace Hopper" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "grace@neuraforge.ai" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "9876543210" } });
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "Marketing" } });
    fireEvent.change(screen.getByLabelText("Designation"), { target: { value: "Engineer" } });
    fireEvent.change(screen.getByLabelText("Work location"), { target: { value: "Irinjalakuda" } });
    fireEvent.change(screen.getByLabelText("Joining day"), { target: { value: "01" } });
    fireEvent.change(screen.getByLabelText("Joining month"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Joining year"), { target: { value: "2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Save employee" }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: "Grace Hopper",
          email: "grace@neuraforge.ai",
          department: "Marketing",
          employmentType: "full_time",
          joiningDate: "2026-10-01",
          deviceUserId: null,
          reportingManagerId: null,
        }),
      );
    });
    const payload = create.mock.calls[0]?.[0] as EmployeePayload | undefined;
    expect(payload).toBeDefined();
    expect(payload).not.toHaveProperty("status");
    expect(await screen.findByRole("heading", { name: /NF-0002/ })).toBeInTheDocument();
  });

  it("returns from an employee record to the list", async () => {
    render(<EmployeesPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Add employee" }));
    expect(await screen.findByRole("heading", { name: "Add employee" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Back to employee list" })[0]);

    expect(await screen.findByRole("heading", { name: "Employee Management" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add employee" })).toBeInTheDocument();
  });
});
