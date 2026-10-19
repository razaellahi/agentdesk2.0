// Preserves PCM 8/16-bit and G.711 A-law/µ-law peak decoding from VRS develop.
export function extractWavPeaks(
  arrayBuffer: ArrayBuffer,
  bars: number = 256,
): { peaks: number[]; durationSec: number } | null {
  bars = Math.max(1, Math.min(4096, Math.floor(bars) || 256));
  const view = new DataView(arrayBuffer);
  if (view.byteLength < 44) {
    return null;
  }
  const tag = (offset: number) =>
    String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    );
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") {
    return null;
  }

  let offset = 12;
  let audioFormat = 0;
  let numChannels = 1;
  let sampleRate = 8000;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= view.byteLength) {
    const chunkId = tag(offset);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkData = offset + 8;
    if (chunkData + chunkSize > view.byteLength) return null;
    if (chunkId === "fmt ") {
      if (chunkSize < 16) return null;
      audioFormat = view.getUint16(chunkData, true);
      numChannels = view.getUint16(chunkData + 2, true);
      sampleRate = view.getUint32(chunkData + 4, true);
      bitsPerSample = view.getUint16(chunkData + 14, true);
    } else if (chunkId === "data") {
      dataOffset = chunkData;
      dataSize = chunkSize;
      break;
    }
    offset = chunkData + chunkSize + (chunkSize % 2);
  }

  if (dataOffset < 0 || dataSize <= 0) {
    return null;
  }

  if (!numChannels || sampleRate <= 0) return null;
  const bytes = audioFormat === 1 && bitsPerSample === 16 ? 2 : 1;
  if (
    !(audioFormat === 1 && [8, 16].includes(bitsPerSample)) &&
    !([6, 7].includes(audioFormat) && bitsPerSample === 8)
  )
    return null;
  const frameCount = Math.floor(dataSize / (bytes * numChannels));
  if (!frameCount) return null;
  const durationSec = frameCount / sampleRate;
  const peaks = new Array<number>(bars).fill(0);
  const sampleAt = (index: number) => {
    const position = dataOffset + index * bytes;
    if (audioFormat === 7) return muLawToLinear(view.getUint8(position));
    if (audioFormat === 6) return aLawToLinear(view.getUint8(position));
    return bytes === 2 ? view.getInt16(position, true) / 32768 : (view.getUint8(position) - 128) / 128;
  };
  // Decode directly into bounded peak buckets; long recordings never allocate one JS number per sample.
  for (let frame = 0; frame < frameCount; frame++) {
    let mixed = 0;
    for (let channel = 0; channel < numChannels; channel++) mixed += sampleAt(frame * numChannels + channel);
    const bucket = Math.min(bars - 1, Math.floor((frame * bars) / frameCount));
    peaks[bucket] = Math.max(peaks[bucket]!, Math.abs(mixed / numChannels));
  }

  return { peaks, durationSec };
}

function aLawToLinear(aLaw: number): number {
  const u = aLaw ^ 0x55;
  const sign = u & 0x80;
  const exponent = (u >> 4) & 0x07;
  const mantissa = u & 0x0f;
  let sample = exponent > 0 ? ((mantissa << 4) + 0x108) << (exponent - 1) : (mantissa << 4) + 8;
  sample = sign ? -sample : sample;
  return sample / 32768;
}

function muLawToLinear(muLaw: number): number {
  const u = ~muLaw;
  const sign = u & 0x80;
  const exponent = (u >> 4) & 0x07;
  const mantissa = u & 0x0f;
  let sample = ((mantissa << 3) + 0x84) << exponent;
  sample -= 0x84;
  sample = sign ? -sample : sample;
  return sample / 32768;
}
