import { describe, expect, it } from "vitest";
import { emailPlainText, sanitizeEmailHtml } from "./emailEditor";

describe("email editor paste boundary", () => {
  it("preserves useful formatting and tables while removing executable content, unsafe links and remote image loads", () => {
    const cleaned = sanitizeEmailHtml(
      '<p onclick="steal()" style="color:red;background-image:url(https://tracker.example)"><b>Hello</b><script>steal()</script><a href="javascript:steal()">bad</a><a href="https://example.com">safe</a><img src="https://tracker.example/pixel"><iframe src="https://evil.example"></iframe></p><table><tr><td colspan="2">Account</td></tr></table>',
    );
    expect(cleaned).toContain("<b>Hello</b>");
    expect(cleaned).toContain('href="https://example.com"');
    expect(cleaned).toContain('colspan="2"');
    expect(cleaned).not.toMatch(/script|onclick|javascript|tracker|iframe|background-image/);
    expect(emailPlainText(cleaned)).toContain("Hellobadsafe");
  });
  it("retains only registered local inline images and strips hostile attributes", () => {
    const image = {
      id: "local",
      file: new File(["image"], "account.png", { type: "image/png" }),
      url: "blob:local",
    };
    const cleaned = sanitizeEmailHtml(
      '<img data-inline-id="local" src="https://evil.example" onerror="steal()"><img data-inline-id="unknown" src="blob:other">',
      [image],
    );
    expect(cleaned).toContain('src="blob:local"');
    expect(cleaned).toContain('data-inline-id="local"');
    expect(cleaned).not.toMatch(/evil|onerror|unknown|other/);
  });
});
