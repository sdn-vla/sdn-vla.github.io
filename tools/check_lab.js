// Self-check for the selection math in lab.js: node tools/check_lab.js
const assert = require("assert");
const M = require("../lab.js");

// jerk of a cubic is constant (6 per step for t^3), and zero for a quadratic
assert.ok(Math.abs(M.jerkRMS([0, 1, 8, 27, 64, 125]) - 6) < 1e-9);
assert.strictEqual(M.jerkRMS([0, 1, 4, 9, 16]), 0);

// k-NN mean distance skips the point itself
assert.strictEqual(M.knn([0, 0], [[0, 0], [3, 4], [6, 8]], 1, 0), 5);
assert.strictEqual(M.knn([0, 0], [[3, 4], [6, 8]], 2), 7.5);

// a candidate inside G and far from B outranks one sitting in B
const G = [[0, 0], [0.1, 0], [0, 0.1], [1, 1]], B = [[1, 1.05], [1.05, 1], [0.95, 1]];
const s = M.ground(G, B, 2);
assert.ok(s[0].R > s[3].R);
// Stage 2 picks the smoothest of the top-M; with no negative set, the densest candidate wins outright
const jerks = [0.5, 0.1, 0.9, 0.0];
assert.strictEqual(M.select(s, jerks, 3, true).pick, 1);
assert.strictEqual(M.select(M.ground(G, [], 2), jerks, 3, false).top.length, 1);
console.log("lab.js math: ok");
