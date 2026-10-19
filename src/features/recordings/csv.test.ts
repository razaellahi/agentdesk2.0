import { describe, expect, it } from "vitest";
import { recordingCsv } from "./csv";
describe("recording CSV parity", () => {
  it("keeps phone leading zeroes, duration zero, profile columns and BOM", () => {
    const csv = recordingCsv(
      [
        {
          sessionId: "s1",
          callingNumber: "001234",
          calledNumber: "+92100",
          duration: 0,
          holdTime: 20,
          queueName: "Support",
          wrapupCode: "Resolved",
        },
      ],
      "EFCX",
    );
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"=""001234"""');
    expect(csv).toContain('"00:00:00"');
    expect(csv).toContain('"00:00:20"');
    expect(csv).toContain('"Queue Name"');
    expect(csv).not.toContain('"Call Direction"');
  });
  it("escapes arbitrary cells and includes Cisco tag data", () => {
    const csv = recordingCsv(
      [{ agentName: '=HYPERLINK("bad")', direction: "INBOUND", tagName: 'Reviewed,"OK"' }],
      "CISCO",
    );
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"Tag"');
    expect(csv).toContain('"Reviewed,""OK"""');
  });
});
