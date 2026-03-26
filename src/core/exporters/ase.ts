/**
 * ase.ts — Adobe Swatch Exchange (.ase) exporter
 *
 * Generates a binary ASE file from color groups.
 * Supported by Illustrator, Photoshop, InDesign, and other Adobe apps.
 *
 * Works in both browser and Node.js (uses ArrayBuffer / DataView only).
 */

import { RAMP_STEPS, type ColorRamp } from "../tokens/colorRamps.js";

export interface AseColor {
  name: string;
  hex: string;
}

export interface AseGroup {
  name: string;
  colors: AseColor[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

function encodeUtf16(name: string): { buf: ArrayBuffer; charCount: number } {
  const charCount = name.length + 1;
  const buf = new ArrayBuffer(charCount * 2);
  const view = new DataView(buf);
  for (let i = 0; i < name.length; i++) {
    view.setUint16(i * 2, name.charCodeAt(i), false);
  }
  view.setUint16(name.length * 2, 0, false);
  return { buf, charCount };
}

function concatBuffers(...buffers: ArrayBuffer[]): ArrayBuffer {
  const total = buffers.reduce((n, b) => n + b.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const b of buffers) {
    out.set(new Uint8Array(b), offset);
    offset += b.byteLength;
  }
  return out.buffer;
}

function makeGroupStart(name: string): ArrayBuffer {
  const { buf: nameBuf, charCount } = encodeUtf16(name);
  const bodyLen = 2 + nameBuf.byteLength;
  const out = new ArrayBuffer(2 + 4 + bodyLen);
  const v = new DataView(out);
  v.setUint16(0, 0x0002, false);
  v.setUint32(2, bodyLen, false);
  v.setUint16(6, charCount, false);
  new Uint8Array(out).set(new Uint8Array(nameBuf), 8);
  return out;
}

function makeGroupEnd(): ArrayBuffer {
  const out = new ArrayBuffer(6);
  const v = new DataView(out);
  v.setUint16(0, 0xc002, false);
  v.setUint32(2, 0, false);
  return out;
}

function makeColorBlock(name: string, hex: string): ArrayBuffer {
  const [r, g, b] = hexToRgb01(hex);
  const { buf: nameBuf, charCount } = encodeUtf16(name);
  const bodyLen = 2 + nameBuf.byteLength + 4 + 12 + 2;
  const out = new ArrayBuffer(2 + 4 + bodyLen);
  const v = new DataView(out);
  let o = 0;
  v.setUint16(o, 0x0001, false); o += 2;
  v.setUint32(o, bodyLen, false); o += 4;
  v.setUint16(o, charCount, false); o += 2;
  new Uint8Array(out).set(new Uint8Array(nameBuf), o); o += nameBuf.byteLength;
  v.setUint8(o, 0x52); o++; // R
  v.setUint8(o, 0x47); o++; // G
  v.setUint8(o, 0x42); o++; // B
  v.setUint8(o, 0x20); o++; // space
  v.setFloat32(o, r, false); o += 4;
  v.setFloat32(o, g, false); o += 4;
  v.setFloat32(o, b, false); o += 4;
  v.setUint16(o, 2, false); // 2 = normal
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Build a binary ASE buffer from an array of color groups. */
export function buildAseBuffer(groups: AseGroup[]): ArrayBuffer {
  const blocks: ArrayBuffer[] = [];
  for (const group of groups) {
    blocks.push(makeGroupStart(group.name));
    for (const color of group.colors) {
      blocks.push(makeColorBlock(color.name, color.hex));
    }
    blocks.push(makeGroupEnd());
  }

  const header = new ArrayBuffer(12);
  const hv = new DataView(header);
  hv.setUint8(0, 0x41); // A
  hv.setUint8(1, 0x53); // S
  hv.setUint8(2, 0x45); // E
  hv.setUint8(3, 0x46); // F
  hv.setUint16(4, 1, false);
  hv.setUint16(6, 0, false);
  hv.setUint32(8, blocks.length, false);

  return concatBuffers(header, ...blocks);
}

/**
 * Convert a RampSet (name → step → hex) to AseGroups.
 * Each ramp becomes a named group with one swatch per step.
 */
export function rampSetToAseGroups(
  ramps: Record<string, ColorRamp>
): AseGroup[] {
  return Object.entries(ramps).map(([name, ramp]) => {
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    return {
      name: label,
      colors: RAMP_STEPS.map((step) => ({
        name: `${label} ${step}`,
        hex: ramp[step] ?? "#000000",
      })),
    };
  });
}

/**
 * Trigger a browser download of the ASE file.
 * Only works in browser/UXP environments.
 */
export function downloadAse(groups: AseGroup[], filename = "swatches.ase"): void {
  const buf = buildAseBuffer(groups);
  const blob = new Blob([buf], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
