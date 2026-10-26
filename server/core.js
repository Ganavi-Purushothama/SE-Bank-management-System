import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { AppError } from "./errors.js";
const executable = fileURLToPath(
  new URL(
    `../build/bank-core${process.platform === "win32" ? ".exe" : ""}`,
    import.meta.url,
  ),
);
export function evaluate(operation, currentBalance, amount, minBalance) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, [], {
      windowsHide: true,
      stdio: ["pipe", "pipe", "ignore"],
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new AppError(503, "Banking engine timed out"));
    }, 2000);
    child.on("error", () => {
      clearTimeout(timer);
      reject(new AppError(503, "Banking engine unavailable"));
    });
    child.stdin.on("error", () => {});
    child.stdout.on("data", (data) => {
      output += data;
      if (output.length > 1024) child.kill();
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      try {
        if (code !== 0) throw new Error();
        const result = JSON.parse(output);
        if (result.status === "REJECTED")
          return reject(new AppError(422, result.reason));
        if (
          result.status !== "APPROVED" ||
          !Number.isSafeInteger(result.newBalance) ||
          result.newBalance < 0
        )
          throw new Error();
        resolve(result.newBalance);
      } catch {
        reject(new AppError(503, "Invalid banking engine response"));
      }
    });
    child.stdin.end(
      JSON.stringify({ operation, currentBalance, amount, minBalance }) + "\n",
    );
  });
}
