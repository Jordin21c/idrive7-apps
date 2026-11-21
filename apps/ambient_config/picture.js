'use strict';
/**
 * picture.js - the cabin with its ambient light glowing in the colours the car shows (or will show), on the Colour
 * tab. The picture is three alpha bitmaps in a glyph atlas (interior.js): the cabin, the upper lights, the lower
 * lights. The renderer tints glyphs, so each part's light is its bitmap drawn in that part's colour over the cabin.
 *
 *   drawInterior(cv, box, upper, lower, opts)
 *     box            { x, y, w }: the picture fills the width, its height follows (heightFor(w))
 *     upper, lower   { rgb, bright } | null (null: the car's own colour, drawn dim grey)
 *     opts.dim       'upper' | 'lower': that part drawn faint (the other is the one being changed)
 */
const fonts = require('./kit/fonts');
const { withAlpha } = require('./kit/canvas');
const INTERIOR = require('./interior');

const FAMILY = 'ambient_interior';
fonts.add(FAMILY, INTERIOR);

const CABIN = [196, 206, 228], BACK = '#05070a', OWN = [120, 126, 136];
const FAINT = 0.3;

const heightFor = (w) => Math.round(w / INTERIOR.aspect);

/** A part's light as the picture shows it: the colour at its brightness (a dim light still shows). */
function lit(c, faint) {
    const rgb = c ? c.rgb : OWN, bright = c ? c.bright : 35;
    const f = 0.3 + 0.7 * Math.max(0, Math.min(100, bright)) / 100;
    return withAlpha(rgb, f * (faint ? FAINT : 1));
}

function glyph(cv, part, box, colour) {
    cv.text(part.ch, box.x, box.y, box.w / part.w * 100, colour, { font: FAMILY, literal: true });
}

function drawInterior(cv, box, upper, lower, opts) {
    const o = opts || {}, h = heightFor(box.w);
    cv.roundRect(box.x, box.y, box.w, h, 6, BACK);
    glyph(cv, INTERIOR.base, box, CABIN);
    if (!lower || lower.bright > 0) glyph(cv, INTERIOR.lower, box, lit(lower, o.dim === 'lower'));
    if (!upper || upper.bright > 0) glyph(cv, INTERIOR.upper, box, lit(upper, o.dim === 'upper'));
    return { x: box.x, y: box.y, w: box.w, h };
}

module.exports = { drawInterior, heightFor, FAMILY };
