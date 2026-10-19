import { describe, expect, it } from "vitest";
import { extractWavPeaks } from "./wavPeaks";
function wave(format: number, bits: number, samples: number[]) {
  const bytes = bits / 8,
    buffer = new ArrayBuffer(44 + samples.length * bytes),
    view = new DataView(buffer);
  const tag = (offset: number, value: string) =>
    [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  tag(0, "RIFF");
  view.setUint32(4, buffer.byteLength - 8, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint16(34, bits, true);
  tag(36, "data");
  view.setUint32(40, samples.length * bytes, true);
  samples.forEach((sample, i) =>
    bits === 16 ? view.setInt16(44 + i * bytes, sample, true) : view.setUint8(44 + i, sample),
  );
  return buffer;
}
describe("VRS WAV peak compatibility", () => {
  it("decodes PCM peaks and duration", () => {
    const result = extractWavPeaks(wave(1, 16, [0, 16384, -32768, 0]), 2);
    expect(result?.peaks).toEqual([0.5, 1]);
    expect(result?.durationSec).toBe(4 / 8000);
    expect(extractWavPeaks(wave(1, 8, [128, 255]), 2)?.peaks).toEqual([0, 127 / 128]);
  });
  it("supports G.711 A-law and mu-law without browser codec support", () => {
    expect(extractWavPeaks(wave(7, 8, [255, 0]), 2)?.peaks[1]).toBeGreaterThan(0.9);
    expect(extractWavPeaks(wave(6, 8, [85, 0]), 2)?.peaks.every(Number.isFinite)).toBe(true);
  });
  it("rejects malformed/truncated headers instead of throwing", () => {
    expect(extractWavPeaks(new ArrayBuffer(10))).toBeNull();
    const buffer = wave(1, 16, [0]);
    new DataView(buffer).setUint32(16, 1, true);
    expect(extractWavPeaks(buffer)).toBeNull();
  });
});
