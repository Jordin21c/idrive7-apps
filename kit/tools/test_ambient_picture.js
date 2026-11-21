'use strict';
// Ambient config's cabin picture (apps/ambient_config/picture.js + interior.js): the picture as a glyph atlas the
// renderer tints, each part's light in that part's colour, a part drawn faint, the car's own colour grey.
//   node kit/tools/test_ambient_picture.js
const path = require('path');
const zlib = require('zlib');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '../..');
// picture.js draws with the kit (fonts, canvas), which an app has beside it only once staged
const built = spawnSync(process.env.MGU_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),
    [path.join(__dirname, 'build.py'), '--preview-only', 'ambient_config'], { encoding: 'utf8' });
if (built.status !== 0) { console.log(built.stdout + built.stderr); process.exit(1); }
const J = path.join(root, 'dist/ambient_config/source/javascript');
const I = require(path.join(J, 'interior'));
const P = require(path.join(J, 'picture'));
const fonts = require(path.join(J, 'kit/fonts'));
const { Canvas } = require(path.join(J, 'kit/canvas'));
const rec = require(path.join(J, 'kit/record'));

let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; console.log('FAIL ' + msg); } };

// the atlas: one size, short enough to go to the renderer in one piece, every bitmap inside it
const s = I.sizes[0];
const alpha = zlib.inflateSync(Buffer.from(s.alpha, 'base64'));
ok(I.sizes.length === 1 && alpha.length === s.atlasW * s.atlasH, 'the atlas is as large as it says');
ok(s.atlasW <= 1024 && s.atlasH <= fonts.PIECE_H, 'it fits the renderer\'s atlas texture in one piece');
[I.base, I.upper, I.lower].forEach((part) => {
    const g = s.glyphs[part.ch.codePointAt(0)];
    ok(g && g[2] === part.w && g[0] >= 0 && g[1] >= 0 && g[0] + g[2] <= s.atlasW && g[1] + g[3] <= s.atlasH, 'bitmap ' + part.ch + ' lies inside the atlas');
    ok(g && Math.abs(g[2] / g[3] - I.aspect) < 0.02, 'bitmap ' + part.ch + ' has the picture\'s shape');
});
ok(fonts.has(P.FAMILY) && fonts.get(P.FAMILY, 300, 'A').size === 100, 'the kit knows the family (one size, whatever is asked)');

// drawn: the cabin grey-blue, the upper lights in the upper colour, the lower in the lower
const W = 668, H = P.heightFor(W);
const draw = (upper, lower, opts) => { const cv = new Canvas(W, H); cv.clear('#000000'); P.drawInterior(cv, { x: 0, y: 0, w: W }, upper, lower, opts); return cv; };
const at = (cv, fx, fy) => { const i = (Math.round(fy * H) * W + Math.round(fx * W)) * 4; return [cv.d[i], cv.d[i + 1], cv.d[i + 2]]; };
// where each light is brightest in its bitmap, as a place on the picture
const peak = (part) => {
    const g = s.glyphs[part.ch.codePointAt(0)];
    let best = 0, bx = 0, by = 0;
    for (let y = 0; y < g[3]; y++) for (let x = 0; x < g[2]; x++) { const v = alpha[(g[1] + y) * s.atlasW + g[0] + x]; if (v > best) { best = v; bx = x; by = y; } }
    return [(bx + 0.5) / g[2], (by + 0.5) / g[3]];
};
const up = peak(I.upper), lo = peak(I.lower);
const RED = { rgb: [255, 0, 0], bright: 100 }, BLUE = { rgb: [0, 0, 255], bright: 100 };
let cv = draw(RED, BLUE);
let a = at(cv, up[0], up[1]), b = at(cv, lo[0], lo[1]);
ok(a[0] > 180 && a[2] < 60, 'the upper lights show the upper colour (' + a + ')');
ok(b[2] > 150 && b[0] < 60, 'the lower lights show the lower colour (' + b + ')');
cv = draw(RED, BLUE, { dim: 'lower' });
ok(at(cv, lo[0], lo[1])[2] < b[2] * 0.6 && at(cv, up[0], up[1])[0] > 180, 'a part drawn faint: dimmer, the other as it was');
cv = draw(null, null);
a = at(cv, up[0], up[1]);
ok(Math.abs(a[0] - a[2]) < 30 && a[0] > 20 && a[0] < 160, 'the car\'s own colour: dim grey (' + a + ')');
cv = draw({ rgb: [255, 0, 0], bright: 0 }, BLUE);
a = at(cv, up[0], up[1]);
ok(a[0] < 120, 'a part switched off: not drawn');
ok(cv.w === W && P.heightFor(W) === Math.round(W / I.aspect), 'the picture keeps its shape');

// the GPU path: three glyph runs from one atlas, no pixel image (those the Store's renderer does not take)
const r = new rec.Recorder(W, H);
P.drawInterior(r, { x: 0, y: 0, w: W }, RED, BLUE);
ok(r.atlases.size === 1 && r.images.size === 0, 'recorded as glyphs of one atlas, no pixel image');

console.log(fails ? fails + ' of ' + checks + ' checks failed' : 'ok: ' + checks + ' checks');
process.exit(fails ? 1 : 0);
