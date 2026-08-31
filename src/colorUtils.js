// Color conversion and harmony generation utilities

/**
 * Convert HEX to RGB
 */
export function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r, g, b };
}

/**
 * Convert RGB to HEX
 */
export function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    const hex = clamped.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Convert HEX to HSL
 */
export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

/**
 * Convert HSL to HEX
 */
export function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

/**
 * Generate color harmonies based on a HEX color
 * Returns an object with arrays of harmony colors
 */
export function generateHarmonies(hex) {
  const { h, s, l } = hexToHsl(hex);

  const wrap = (deg) => ((deg % 360) + 360) % 360;

  return {
    complementary: [hslToHex(wrap(h + 180), s, l)],
    analogous: [
      hslToHex(wrap(h - 30), s, l),
      hslToHex(wrap(h + 30), s, l),
    ],
    triadic: [
      hslToHex(wrap(h + 120), s, l),
      hslToHex(wrap(h - 120), s, l),
    ],
    splitComplementary: [
      hslToHex(wrap(h + 150), s, l),
      hslToHex(wrap(h + 210), s, l),
    ],
    tetradic: [
      hslToHex(wrap(h + 90), s, l),
      hslToHex(wrap(h + 180), s, l),
      hslToHex(wrap(h + 270), s, l),
    ],
  };
}

/**
 * Generate shades (darker) and tints (lighter) of a color
 */
export function generateShades(hex, count = 5) {
  const { h, s, l } = hexToHsl(hex);
  const shades = [];
  const tints = [];

  for (let i = 1; i <= count; i++) {
    const shadeL = Math.max(0, l - (i * (l / (count + 1))));
    const tintL = Math.min(100, l + (i * ((100 - l) / (count + 1))));
    shades.push(hslToHex(h, s, shadeL));
    tints.push(hslToHex(h, s, tintL));
  }

  return { shades: shades.reverse(), tints };
}