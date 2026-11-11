/* Payout math, per DECA's stated rule: "When the campaign closes its pool is
   split equally across accepted posts, never less than the floor, and sent
   the Monday after." */
(function (root) {
  function num(v) {
    if (v === null || v === undefined) return NaN;
    var s = String(v).replace(/[$,\s]/g, "");
    if (s === "") return NaN;
    return Number(s);
  }
  function cents(x) { return Math.round(x * 100) / 100; }

  function payout(input) {
    var pool = num(input.pool), posts = num(input.posts), floor = num(input.floor);
    var mine = input.mine === undefined || input.mine === "" ? 1 : num(input.mine);
    var errors = [];
    if (!(pool >= 0)) errors.push("Enter the campaign pool in dollars.");
    if (!(posts >= 1) || Math.floor(posts) !== posts) errors.push("Accepted posts must be a whole number, 1 or more.");
    if (!(floor >= 0)) errors.push("Enter the floor per post in dollars (0 if none).");
    if (!(mine >= 0) || Math.floor(mine) !== mine) errors.push("Your accepted posts must be a whole number.");
    else if (posts >= 1 && mine > posts) errors.push("Your accepted posts can't be more than the total accepted posts.");
    if (errors.length) return { ok: false, errors: errors };
    var split = pool / posts;
    var floorApplies = split < floor;
    var perPost = floorApplies ? floor : split;
    return {
      ok: true,
      pool: pool, posts: posts, floor: floor, mine: mine,
      split: cents(split),
      perPost: cents(perPost),
      floorApplies: floorApplies,
      yourTotal: cents(perPost * mine),
      paidOutTotal: cents(perPost * posts),
      overPool: floorApplies ? cents(perPost * posts - pool) : 0,
      postsCoveredByPool: floor > 0 ? Math.floor(pool / floor + 1e-9) : Infinity
    };
  }

  /* The Monday after the close date. A close on a Monday is paid the next
     Monday, 7 days later. Dates are plain calendar dates (YYYY-MM-DD). */
  function mondayAfter(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    if (!m) return null;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
    var dow = d.getUTCDay(); // 0 Sun .. 6 Sat
    var add = ((1 - dow + 7) % 7) || 7;
    d.setUTCDate(d.getUTCDate() + add);
    return d.toISOString().slice(0, 10);
  }

  function money(x) {
    var neg = x < 0; x = Math.abs(x);
    var s = x.toFixed(2).split(".");
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "-$" : "$") + (s[1] === "00" ? s[0] : s.join("."));
  }

  var api = { payout: payout, mondayAfter: mondayAfter, money: money, num: num };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KitCalc = api;
})(this);
