// Run: node docs/test-reports/code/summarize-gcov.mjs path/to/bank-core-main.gcov.json.gz
// Reports project-only coverage; standard-library headers are excluded.
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

if (!process.argv[2]) throw new Error("Supply the gcov JSON gzip path");
const data = JSON.parse(gunzipSync(readFileSync(process.argv[2])));
const files = data.files
  .filter((file) => /core[\\/](main.cpp|banking.hpp)$/.test(file.file))
  .map((file) => {
    const branches = file.lines.flatMap((line) => line.branches);
    return {
      file: file.file,
      executableLines: file.lines.length,
      coveredLines: file.lines.filter((line) => line.count > 0).length,
      branchEdges: branches.length,
      takenEdges: branches.filter((branch) => branch.count > 0).length,
    };
  });
if (files.length !== 2) throw new Error("Expected both C++ project files");
const sum = (key) => files.reduce((total, file) => total + file[key], 0);
const percent = (covered, total) => Number(((100 * covered) / total).toFixed(2));
console.log(JSON.stringify({
  files,
  linePercent: percent(sum("coveredLines"), sum("executableLines")),
  branchEdgePercent: percent(sum("takenEdges"), sum("branchEdges")),
}, null, 2));
