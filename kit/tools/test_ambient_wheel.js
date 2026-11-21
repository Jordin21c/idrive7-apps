'use strict';
// Ambient config's colour wheel and bars (apps/ambient_config/wheel.js): the hue around the wheel, white in the
// middle, the knob's place, a finger on and off the bars, the bands the wheel is drawn in, the car's colours.
//   node kit/tools/test_ambient_wheel.js
const path = require('path');
const A = path.join(__dirname, '..', '..', 'apps', 'ambient_config');
const W = require(path.join(A, 'wheel'));
const S = require(path.join(A, 'scenes'));

let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; console.log('FAIL ' + msg); } };
const same = (a, b) => a.join() === b.join();
const WH = { cx: 200, cy: 300, R: 150 };

// the wheel: the middle white, the rim the full colour, clockwise from 12 o'clock as the ring was
ok(same(W.colour(0, 0), [255, 255, 255]) && same(W.colour(200, 0), [255, 255, 255]), 'no saturation: white, whatever the hue');
ok(same(W.colour(0, 1), [255, 0, 0]) && same(W.colour(120, 1), [0, 255, 0]) && same(W.colour(240, 1), [0, 0, 255]), 'full saturation: the full colours');
ok(same(W.colour(0, 0.5), [255, 128, 128]), 'half way: the colour mixed with white');
let p = W.wheelAt(WH, 200, 300);
ok(p && p.s === 0, 'the middle: white');
p = W.wheelAt(WH, 200, 300 - 150);
ok(p && p.h === 0 && p.s === 1, 'the top of the rim: full red');
p = W.wheelAt(WH, 200 + 150, 300);
ok(p && p.h === 90 && p.s === 1, 'the right of the rim: 90 degrees');
p = W.wheelAt(WH, 200, 300 + 75);
ok(p && p.h === 180 && p.s === 0.5, 'half way down: cyan, half white');
p = W.wheelAt(WH, 200 + 4, 300 - 150);
ok(p && p.h === 0, 'within 5 degrees of red: exactly red');
ok(W.wheelAt(WH, 200, 300 - 150 - W.EDGE + 1) && W.wheelAt(WH, 200, 300 - 150 - W.EDGE - 1) === null, 'a finger just off the rim still counts, further out not');
p = W.wheelAt(WH, 200 + 400, 300, true);
ok(p && p.h === 90 && p.s === 1, 'dragged off the wheel: its nearest place on the rim');
p = W.wheelAt(WH, 200 + 150 * 0.05, 300);
ok(p && p.s === 0, 'near the middle: white (a finger cannot hit one pixel)');
p = W.wheelAt(WH, 200 + 150 * 0.96, 300);
ok(p && p.s === 1, 'near the rim: the full colour');

// the knob: where the colour is, and back again
[[0, 1], [90, 1], [200, 0.4], [315, 0.75], [45, 0]].forEach(([h, s]) => {
    const k = W.wheelPos(WH, h, s), q = W.wheelAt(WH, k.x, k.y);
    ok(q && Math.abs(q.s - s) < 0.011 && (s === 0 || Math.abs(((q.h - h + 540) % 360) - 180) < 1), 'the knob at ' + h + ', ' + s + ' reads back the same');
});

// a colour's saturation, and a picked colour read back from its RGB
ok(W.satOf([255, 255, 255]) === 0 && W.satOf([0, 0, 0]) === 0 && W.satOf([255, 0, 0]) === 1, 'white and black: none; red: full');
[[10, 1], [130, 0.6], [275, 0.3], [330, 0.85]].forEach(([h, s]) => {
    const rgb = W.colour(h, s);
    ok(Math.abs(W.satOf(rgb) - s) < 0.01 && Math.abs(((S.hueOf(rgb) - h + 540) % 360) - 180) < 2, 'hue ' + h + ' at ' + s + ' reads back from its RGB');
});

// the bars
const B = { x: 100, y: 50, w: 200, h: 22 };
ok(W.barAt(B, 100, 60) === 0 && W.barAt(B, 300, 60) === 1 && W.barAt(B, 200, 60) === 0.5, 'a bar: 0 at its left end, 1 at its right');
ok(W.barAt(B, 200, 50 - W.EDGE - 1) === null && W.barAt(B, 100 - W.EDGE - 1, 60) === null, 'off the bar: nothing');
ok(W.barAt(B, 100 - W.EDGE + 1, 60) === 0, 'just off its end: the end');
ok(W.barF(B, -500) === 0 && W.barF(B, 5000) === 1 && W.barF(B, 150) === 0.25, 'dragged off a bar: its nearest end');

// the bands the wheel is drawn in
const bands = W.rings(15);
ok(bands.length === 15 && bands[0].r0 === 0 && bands[14].r1 === 1, '15 bands from the middle to the rim');
ok(bands[0].s === 0 && bands[0].ramp.every((c) => c === '#ffffff'), 'the middle band: white');
ok(bands[14].s === 1 && bands[14].ramp[0] === '#ff0000' && bands[14].ramp[2] === '#00ff00' && bands[14].ramp[6] === '#ff0000', 'the rim band: the full colours, red again at the end');
ok(bands.every((b, i) => !i || (b.r0 === bands[i - 1].r1 && b.s > bands[i - 1].s)), 'each band starts where the last ended, a step fuller');

// the car's colours: nine and white, every byte one the lights take (FF means "no change" on the wire: lin.js caps it)
ok(W.CAR.length === 10 && W.CAR[9][0] === 'White', 'nine colours and white');
ok(W.CAR.every(([n, rgb]) => typeof n === 'string' && rgb.length === 3 && rgb.every((v) => v >= 0 && v <= 255 && v === Math.round(v))), 'each a name and an RGB');
ok(new Set(W.CAR.map((c) => c[0])).size === 10, 'no name twice');

console.log(fails ? fails + ' of ' + checks + ' checks failed' : 'ok: ' + checks + ' checks');
process.exit(fails ? 1 : 0);
