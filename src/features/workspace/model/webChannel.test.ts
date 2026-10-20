import { describe, expect, it } from "vitest";
import { readWebChannel } from "./webChannel";
import type { ChannelSession } from "./types";

const session = (patch: Partial<ChannelSession["channelData"]> = {}, extra: Partial<ChannelSession> = {}) =>
  ({
    id: "s1",
    channel: { channelType: { name: "WEB" } },
    channelData: { channelCustomerIdentifier: "visitor-1", ...patch },
    ...extra,
  }) as unknown as ChannelSession;

describe("readWebChannel", () => {
  it("returns null for a session that is not a web chat", () => {
    expect(readWebChannel(session({ additionalAttributes: [{ key: "x", type: "other", value: 1 }] }))).toBeNull();
  });

  it("reads device, browser, locale and the submitted form", () => {
    const info = readWebChannel(
      session({
        additionalAttributes: [
          {
            type: "webChannelData",
            value: {
              browserDeviceInfo: { deviceType: "mobile", browserName: "Chrome" },
              locale: { country: "Pakistan", language: "en-GB" },
              formData: { attributes: [{ key: "orderNumber", value: "A-12" }, { value: "no key" }] },
            },
          },
        ],
      }),
    );
    expect(info).toEqual({
      deviceType: "mobile",
      browser: "Chrome",
      country: "Pakistan",
      language: "en-GB",
      formData: [{ key: "orderNumber", value: "A-12" }],
    });
  });

  it("prefers webChannelData already parsed onto the session", () => {
    const info = readWebChannel(
      session({}, { webChannelData: { browserDeviceInfo: { deviceType: "desktop" } } }),
    );
    expect(info?.deviceType).toBe("desktop");
    expect(info?.browser).toBeNull();
    expect(info?.formData).toEqual([]);
  });
});
