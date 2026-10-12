// Converts the handful of letters engraved on the medal into the JSON
// format three.js reads for 3D text.
// Usage: node scripts/build-medal-font.mjs path/to/Marcellus-Regular.ttf
import { readFileSync, writeFileSync } from "node:fs";
import opentype from "opentype.js";

const font = opentype.parse(readFileSync(process.argv[2]).buffer);
const chars = "SILVERMDALF 0123456789";
const glyphs = {};
for (const ch of new Set(chars)) {
  const g = font.charToGlyph(ch);
  const o = g.path.commands
    .map((c) => {
      if (c.type === "M") return `m ${c.x} ${c.y}`;
      if (c.type === "L") return `l ${c.x} ${c.y}`;
      if (c.type === "Q") return `q ${c.x} ${c.y} ${c.x1} ${c.y1}`;
      if (c.type === "C") return `b ${c.x} ${c.y} ${c.x1} ${c.y1} ${c.x2} ${c.y2}`;
      return "z";
    })
    .join(" ");
  glyphs[ch] = { ha: g.advanceWidth, x_min: g.xMin ?? 0, x_max: g.xMax ?? 0, o };
}
writeFileSync(
  "src/campaign/ui/medal-font.json",
  JSON.stringify({
    glyphs,
    familyName: "Marcellus",
    ascender: font.ascender,
    descender: font.descender,
    underlinePosition: -100,
    underlineThickness: 50,
    boundingBox: { xMin: font.tables.head.xMin, xMax: font.tables.head.xMax, yMin: font.tables.head.yMin, yMax: font.tables.head.yMax },
    resolution: font.unitsPerEm,
    original_font_information: { license: "SIL Open Font License 1.1", source: "Marcellus, Astigmatic" },
  }),
);
console.log("wrote", Object.keys(glyphs).length, "glyphs");
