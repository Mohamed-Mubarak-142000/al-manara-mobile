// Copies the brand palette and shadows from the website's @theme block into src/global.css.
// Usage: npm run sync:tokens   (WEB_REPO overrides the default ../eslam-platform)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webRepo = path.resolve(root, process.env.WEB_REPO ?? "../eslam-platform");
const webCss = fs.readFileSync(path.join(webRepo, "src/app/globals.css"), "utf8");

const theme = webCss.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1];
if (!theme) throw new Error(`No @theme block found in ${webRepo}/src/app/globals.css`);

const tokens = [...theme.matchAll(/^\s*(--(?:color|shadow)-[\w-]+):\s*([^;]+);/gm)].map(([, name, value]) => `  ${name}: ${value.trim()};`);
if (tokens.length === 0) throw new Error("The website @theme block has no --color-* or --shadow-* tokens");

const target = path.join(root, "src/global.css");
const css = fs.readFileSync(target, "utf8");
const start = "/* @sync:brand:start */";
const end = "/* @sync:brand:end */";
const from = css.indexOf(start);
const to = css.indexOf(end);
if (from === -1 || to === -1) throw new Error("src/global.css is missing the @sync:brand markers");

const next = `${css.slice(0, from + start.length)}\n${tokens.join("\n")}\n  ${css.slice(to)}`;
fs.writeFileSync(target, next);
console.log(`Synced ${tokens.length} tokens from ${path.relative(root, webRepo)}`);
