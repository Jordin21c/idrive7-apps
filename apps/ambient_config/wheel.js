'use strict';
/**
 * wheel.js - the Colour tab's colour wheel and bars. Pure: places in, colours out.
 *
 * The wheel has every hue around it and white in the middle: the angle is the hue (clockwise from 12 o'clock, as the
 * ring it replaces), the distance from the middle the saturation (0 white, 1 the full colour at the rim). The lights
 * take any RGB, so a pale colour is the full one mixed with white: hsv(hue, saturation, 1).
 *
 *   wheelAt(W, x, y, force) -> { h, s } | null (outside the wheel; force: its nearest place)   W = { cx, cy, R }
 *   wheelPos(W, h, s)  -> { x, y }, the knob's place
 *   barAt(B, x, y)     -> 0..1 | null (off the bar)                 B = { x, y, w, h }
 *   barF(B, x)         -> 0..1 along the bar, wherever the finger is
 *   satOf(rgb)         -> 0..1
 *   rings(n)           -> [{ r0, r1 (fractions of R), ramp }] the wheel's bands, from the white middle out
 */
const S = require('./scenes');

const EDGE = 14;            // a finger this far off the wheel or a bar still counts
const WHITE_IN = 0.07;      // nearer the middle than this: white
const FULL_OUT = 0.94;      // further out than this: the full colour
const HUES = [0, 60, 120, 180, 240, 300, 360];

// the car's nine menu colours by name (approximate RGB, starting points), and white
const CAR = [['Ivory', [255, 236, 200]], ['Citrine', [255, 196, 40]], ['Coral', [255, 110, 70]], ['Flamingo', [255, 70, 120]],
    ['Pearl', [225, 230, 255]], ['Turquoise', [0, 210, 200]], ['Emerald', [20, 210, 90]], ['Rose', [255, 120, 170]],
    ['Azure', [40, 120, 255]], ['White', [255, 255, 255]]];

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** How far a colour is from white: 0 white or grey, 1 a full colour. */
function satOf(rgb) {
    const mx = Math.max(rgb[0], rgb[1], rgb[2]), mn = Math.min(rgb[0], rgb[1], rgb[2]);
    return mx > 0 ? (mx - mn) / mx : 0;
}

/** The colour of hue h (0-360) at saturation s (0..1), at its fullest. */
const colour = (h, s) => S.hsv(((h % 360) + 360) % 360, clamp01(s), 1);

/** The hue and saturation under a finger on the wheel, or null outside it. */
function wheelAt(W, x, y, force) {
    const dx = x - W.cx, dy = y - W.cy, d = Math.sqrt(dx * dx + dy * dy);
    if (d > W.R + EDGE && !force) return null;
    const f = d / W.R;
    const s = f <= WHITE_IN ? 0 : f >= FULL_OUT ? 1 : Math.round(f * 100) / 100;
    return { h: S.snapHue((Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360), s };
}

/** Where the knob sits for hue h and saturation s. */
function wheelPos(W, h, s) {
    const a = h * Math.PI / 180, r = clamp01(s) * W.R;
    return { x: W.cx + Math.sin(a) * r, y: W.cy - Math.cos(a) * r };
}

/** A finger on a bar: how far along it (0..1), or null off it. */
function barAt(B, x, y) {
    if (y < B.y - EDGE || y > B.y + B.h + EDGE || x < B.x - EDGE || x > B.x + B.w + EDGE) return null;
    return clamp01((x - B.x) / B.w);
}

/** How far along a bar a finger at x is (0..1), on it or dragged off it. */
const barF = (B, x) => clamp01((x - B.x) / B.w);

/** The wheel as n bands: the middle white, each band out a step fuller, the last the full colours. */
function rings(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
        const s = i / (n - 1);
        out.push({ r0: i / n, r1: (i + 1) / n, s, ramp: HUES.map((h) => S.hex(colour(h, s))) });
    }
    return out;
}

module.exports = { CAR, EDGE, WHITE_IN, FULL_OUT, satOf, colour, wheelAt, wheelPos, barAt, barF, rings };
