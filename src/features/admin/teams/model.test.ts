import { describe, expect, it } from "vitest";
import {
  canDeleteTeam,
  filterTeams,
  memberDiff,
  mergeDirectory,
  supervisorPickerLocked,
  teamWriteBody,
  validateTeam,
} from "./model";

describe("team membership", () => {
  it("diffs usernames into adds and removes", () => {
    expect(memberDiff(["a", "b"], ["b", "c"])).toEqual({ add: ["c"], remove: ["a"] });
  });

  it("keeps current members in the picker when the directory page omits them", () => {
    expect(
      mergeDirectory(
        [{ id: "1", username: "sana", firstName: "Sana", lastName: "Iqbal" }],
        [{ id: "2", username: "hassan", name: "Hassan Ali" }],
      ),
    ).toEqual([
      { id: "1", username: "sana", firstName: "Sana", lastName: "Iqbal" },
      { id: "2", username: "hassan", firstName: "Hassan Ali" },
    ]);
  });
});

describe("team rules", () => {
  it("lets admins delete any team and supervisors delete only teams they created", () => {
    expect(canDeleteTeam({ roles: ["admin"], username: "admin", createdBy: "supervisor" })).toBe(true);
    expect(canDeleteTeam({ roles: ["supervisor"], username: "omar", createdBy: "omar" })).toBe(true);
    expect(canDeleteTeam({ roles: ["supervisor"], username: "omar", createdBy: "leila" })).toBe(false);
    expect(canDeleteTeam({ roles: ["agent"], username: "sana", createdBy: "sana" })).toBe(false);
  });

  it("locks the supervisor field for supervisors and leaves it open for admins", () => {
    expect(supervisorPickerLocked(["supervisor", "agent"])).toBe(true);
    expect(supervisorPickerLocked(["admin"])).toBe(false);
    expect(supervisorPickerLocked(["admin", "supervisor"])).toBe(false);
  });

  it("requires a unique name and a short description", () => {
    const existing = [{ team_Id: "t1", team_name: "Support" }];
    expect(validateTeam({ name: "  ", description: "" }, existing)).toBe("name-required");
    expect(validateTeam({ name: "Support", description: "" }, existing)).toBe("name-duplicate");
    expect(validateTeam({ name: "Support", description: "" }, existing, "t1")).toBeNull();
    expect(validateTeam({ name: "Night", description: "x".repeat(301) }, existing)).toBe("description-long");
  });

  it("searches by team name and writes the unified-admin body", () => {
    expect(filterTeams([{ team_name: "Support" }, { team_name: "Sales" }], "sal")).toEqual([
      { team_name: "Sales" },
    ]);
    expect(
      teamWriteBody({ name: " Night ", description: " Late ", supervisorId: "", createdBy: "admin" }),
    ).toEqual({
      team_name: "Night",
      description: "Late",
      supervisor_Id: null,
      source: "CX",
      created_by: "admin",
    });
  });
});
