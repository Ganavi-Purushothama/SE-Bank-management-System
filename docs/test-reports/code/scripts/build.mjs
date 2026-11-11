import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
mkdirSync("build", { recursive: true });
const output =
  process.platform === "win32" ? "build/bank-core.exe" : "build/bank-core";
const result = spawnSync(
  process.env.CXX || "g++",
  [
    "-std=c++17",
    "-O2",
    "-Wall",
    "-Wextra",
    "-Werror",
    "core/main.cpp",
    "-o",
    output,
  ],
  { stdio: "inherit" },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
