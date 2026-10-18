import { describe, expect, it } from "vitest";
import { teamMemberAdminToRow, teamMemberToRow } from "./cms-mappers";

describe("teamMemberToRow", () => {
  it("maps public team member fields", () => {
    const row = teamMemberToRow({
      id: "1",
      fullName: "Jane Doe",
      designation: "Engineer",
      department: "Engineering",
      positionInCompany: "Technical",
      bio: "Builds software.",
      photo: { url: "https://example.com/photo.jpg" },
      order: 2,
    });

    expect(row).toEqual({
      id: "1",
      fullName: "Jane Doe",
      designation: "Engineer",
      department: "Engineering",
      positionInCompany: "Technical",
      bio: "Builds software.",
      photoUrl: "https://example.com/photo.jpg",
      sort: 2,
    });
  });
});

describe("teamMemberAdminToRow", () => {
  it("includes admin status and updated timestamp", () => {
    const row = teamMemberAdminToRow({
      id: "2",
      fullName: "John Smith",
      designation: "Lead",
      department: "Delivery",
      positionInCompany: "Leadership",
      bio: "",
      photo: { url: "https://example.com/j.jpg", publicId: "credex/team-members/2" },
      order: 1,
      status: "draft",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });

    expect(row.status).toBe("draft");
    expect(row.updatedAt).toBe("2026-01-02T00:00:00.000Z");
    expect(row.photoUrl).toBe("https://example.com/j.jpg");
  });
});
