#!/usr/bin/env node
/* tools/stamp.js — قبل از هر انتشار اجرا کن:  node tools/stamp.js [--force] [--notes "متن"]
   کارها:
     ۱) از محتوای همهٔ فایل‌های قابل‌انتشار یک BUILD ID (۱۲ کاراکتر) می‌سازد؛
     ۲) آن را داخل sw.js و app/index.html (بین نشانگرهای B و E) می‌نویسد؛
     ۳) version.json می‌سازد:  { build, time, force, notes }
   اگر هیچ فایلی عوض نشده باشد، BUILD همان قبلی می‌ماند (idempotent).
   --force : همهٔ کاربران را مجبور می‌کند به محض امن‌بودن (بدون ویرایش ذخیره‌نشده) آپدیت کنند.
   فقط Node ≥ 16؛ بدون وابستگی. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const SKIP_DIRS = new Set(["tools", "deploy", "docs", ".github", ".git", "node_modules"]);
const SKIP_FILES = new Set(["version.json", "HOW-TO-DEPLOY.txt", ".nojekyll", ".DS_Store"]);
const STAMPED = ["sw.js", "app/index.html"];
const MARK = /\/\*B\*\/"[^"]*"\/\*E\*\//g;

function walk(dir, out) {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(name)) walk(p, out); }
    else if (!SKIP_FILES.has(name)) out.push(p);
  }
  return out;
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const ni = args.indexOf("--notes");
const notes = ni >= 0 ? String(args[ni + 1] || "") : "";

const files = walk(ROOT, []);
const h = crypto.createHash("sha256");
for (const f of files) {
  const rel = path.relative(ROOT, f).split(path.sep).join("/");
  let buf = fs.readFileSync(f);
  if (STAMPED.includes(rel)) buf = Buffer.from(buf.toString("utf8").replace(MARK, '/*B*/"__B__"/*E*/'));
  h.update(rel + "\0");
  h.update(buf);
  h.update("\0");
}
const build = h.digest("hex").slice(0, 12);

for (const rel of STAMPED) {
  const f = path.join(ROOT, rel);
  const src = fs.readFileSync(f, "utf8");
  const n = (src.match(MARK) || []).length;
  if (n !== 1) { console.error("✗ نشانگر /*B*/…/*E*/ در " + rel + " باید دقیقاً یکی باشد (الان " + n + ")"); process.exit(1); }
  fs.writeFileSync(f, src.replace(MARK, '/*B*/"' + build + '"/*E*/'));
}

// کنترل سلامت: همهٔ فایل‌های PRECACHE باید وجود داشته باشند.
const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const list = (sw.match(/const PRECACHE = \[([\s\S]*?)\];/) || [, ""])[1].match(/"[^"]+"/g) || [];
for (const q of list) {
  const rel = q.slice(1, -1);
  const p = path.join(ROOT, rel.endsWith("/") ? rel + "index.html" : rel);
  if (!fs.existsSync(p)) { console.error("✗ فایل PRECACHE پیدا نشد: " + rel); process.exit(1); }
}

const vf = path.join(ROOT, "version.json");
let prev = {};
try { prev = JSON.parse(fs.readFileSync(vf, "utf8")); } catch (e) {}
const out = { build, time: prev.build === build && prev.time ? prev.time : new Date().toISOString(), force: force, notes: notes || (prev.build === build ? prev.notes || "" : "") };
fs.writeFileSync(vf, JSON.stringify(out) + "\n");
console.log("✓ BUILD " + build + (force ? "  (force)" : "") + "  — " + files.length + " فایل، " + list.length + " مورد در PRECACHE");
