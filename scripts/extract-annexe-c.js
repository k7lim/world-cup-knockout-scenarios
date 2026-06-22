const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "FWC2026_regulations_EN.md");
const outPath = path.join(root, "data", "annexe-c.json");

const source = fs.readFileSync(sourcePath, "utf8");
const start = source.indexOf("COMBINATIONS\nFOR EIGHT BEST\nTHIRD");

if (start === -1) {
  throw new Error("Could not find Annexe C heading in regulations markdown.");
}

const annexe = source.slice(start);
const rows = [];
const rowPattern =
  /^\s*(\d{1,3})\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])\s*$/gm;

let match;
while ((match = rowPattern.exec(annexe))) {
  const [
    ,
    option,
    groupA,
    groupB,
    groupD,
    groupE,
    groupG,
    groupI,
    groupK,
    groupL,
  ] = match;

  rows.push({
    option: Number(option),
    qualifiers: [
      groupA[1],
      groupB[1],
      groupD[1],
      groupE[1],
      groupG[1],
      groupI[1],
      groupK[1],
      groupL[1],
    ].sort().join(""),
    slots: {
      "1A": groupA,
      "1B": groupB,
      "1D": groupD,
      "1E": groupE,
      "1G": groupG,
      "1I": groupI,
      "1K": groupK,
      "1L": groupL,
    },
  });
}

if (rows.length !== 495) {
  throw new Error(`Expected 495 Annexe C rows, found ${rows.length}.`);
}

const duplicateKeys = rows
  .map((row) => row.qualifiers)
  .filter((key, index, all) => all.indexOf(key) !== index);

if (duplicateKeys.length) {
  throw new Error(`Duplicate qualifier sets found: ${duplicateKeys.join(", ")}`);
}

fs.writeFileSync(outPath, `${JSON.stringify(rows, null, 2)}\n`);
console.log(`Wrote ${rows.length} Annexe C rows to ${outPath}`);
