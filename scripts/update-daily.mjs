import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pool = JSON.parse(
  await readFile(path.join(root, "data", "quest-pool.json"), "utf8"),
);

const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(new Date());
const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
const date = `${values.year}-${values.month}-${values.day}`;
const start = Date.UTC(Number(values.year), 0, 0);
const current = Date.UTC(
  Number(values.year),
  Number(values.month) - 1,
  Number(values.day),
);
const dayOfYear = Math.floor((current - start) / 86400000);
const selected = pool[(dayOfYear - 1) % pool.length];

const output = {
  date,
  dayOfYear,
  quest: {
    title: selected.title,
    description: selected.description,
    xp: selected.xp,
    minutes: selected.minutes,
    type: selected.type,
  },
  why: selected.why,
};

await writeFile(
  path.join(root, "data", "daily.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(`Daily adventure updated for ${date}: ${selected.title}`);
