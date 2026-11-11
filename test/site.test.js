const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const C = require("../site/calc.js");
const SITE = path.join(__dirname, "..", "site");

test("pool split equally when above floor", () => {
  const r = C.payout({ pool: 3000, posts: 40, floor: 50, mine: 2 });
  assert.ok(r.ok);
  assert.strictEqual(r.perPost, 75);
  assert.strictEqual(r.floorApplies, false);
  assert.strictEqual(r.yourTotal, 150);
  assert.strictEqual(r.paidOutTotal, 3000);
});

test("floor applies when the split falls below it", () => {
  const r = C.payout({ pool: 1000, posts: 50, floor: 30, mine: 3 });
  assert.strictEqual(r.split, 20);
  assert.strictEqual(r.perPost, 30);
  assert.strictEqual(r.floorApplies, true);
  assert.strictEqual(r.yourTotal, 90);
  assert.strictEqual(r.paidOutTotal, 1500);
  assert.strictEqual(r.overPool, 500);
  assert.strictEqual(r.postsCoveredByPool, 33);
});

test("split exactly equal to floor is not flagged", () => {
  const r = C.payout({ pool: 1500, posts: 50, floor: 30 });
  assert.strictEqual(r.perPost, 30);
  assert.strictEqual(r.floorApplies, false);
  assert.strictEqual(r.mine, 1);
});

test("rounds to cents and accepts formatted input", () => {
  const r = C.payout({ pool: "$1,000", posts: "3", floor: "0", mine: "1" });
  assert.strictEqual(r.perPost, 333.33);
  assert.strictEqual(C.money(333.33), "$333.33");
  assert.strictEqual(C.money(3000), "$3,000");
});

test("bad input is rejected with plain messages", () => {
  assert.strictEqual(C.payout({ pool: 100, posts: 0, floor: 5 }).ok, false);
  assert.strictEqual(C.payout({ pool: "", posts: 5, floor: 5 }).ok, false);
  assert.strictEqual(C.payout({ pool: 100, posts: 2.5, floor: 5 }).ok, false);
  assert.strictEqual(C.payout({ pool: 100, posts: 5, floor: 5, mine: 6 }).ok, false);
  assert.strictEqual(C.payout({ pool: -1, posts: 5, floor: 5 }).ok, false);
});

test("Monday after the close date", () => {
  assert.strictEqual(C.mondayAfter("2026-11-10"), "2026-11-16"); // Tue
  assert.strictEqual(C.mondayAfter("2026-11-15"), "2026-11-16"); // Sun
  assert.strictEqual(C.mondayAfter("2026-11-16"), "2026-11-23"); // Mon -> next Mon
  assert.strictEqual(C.mondayAfter("2026-12-31"), "2027-01-04"); // year rollover
  assert.strictEqual(C.mondayAfter("2028-02-28"), "2028-03-06"); // leap year (Mon 28 Feb)
  assert.strictEqual(C.mondayAfter("2026-02-30"), null);
  assert.strictEqual(C.mondayAfter(""), null);
});

test("site files: content, viewport, local assets, no placeholders", () => {
  const html = fs.readFileSync(path.join(SITE, "index.html"), "utf8");
  assert.match(html, /<title>DECA Creator Kit/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /og:image/);
  assert.match(html, /https:\/\/app\.decalabs\.ai\/join\/creator/);
  assert.match(html, /Not affiliated with DECA/);
  for (const m of html.matchAll(/(?:src|href)="([^"#:]+?)(?:\?[^"]*)?"/g)) {
    assert.ok(fs.existsSync(path.join(SITE, m[1])), "missing local asset " + m[1]);
  }
  const all = ["index.html", "app.js", "data.js", "styles.css"].map(f => fs.readFileSync(path.join(SITE, f), "utf8")).join("\n");
  assert.doesNotMatch(all, /lorem|TODO|\[link\]|placeholder text/i);
  assert.ok(fs.statSync(path.join(SITE, "og.png")).size > 1000);
});

test("every app has full kit content", () => {
  global.window = {};
  require("../site/data.js");
  const apps = global.window.KIT_APPS;
  assert.strictEqual(apps.length, 8);
  for (const a of apps) {
    assert.strictEqual(a.hooks.length, 5, a.name);
    assert.ok(a.shots.length >= 6 && a.shots.length <= 8, a.name);
    assert.strictEqual(a.captions.length, 3, a.name);
    assert.ok(a.tags.length >= 3, a.name);
    assert.ok(a.show.length >= 4, a.name);
    for (const [, u] of a.links) assert.match(u, /^https:\/\//);
  }
  assert.deepStrictEqual(Object.keys(global.window.KIT_PLATFORMS), ["tiktok", "reels", "shorts"]);
});
