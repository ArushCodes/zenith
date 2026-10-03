import { build } from "esbuild";
import { mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
await mkdir("tmp", { recursive: true });
const file = "tmp/regression-tests.mjs";
try {
  await build({
    entryPoints: ["tests/regressions.ts"],
    outfile: file,
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    alias: { "@": "./src" },
    plugins: [
      {
        name: "server-only-test-boundary",
        setup(builder) {
          builder.onResolve({ filter: /^@tanstack\/react-start\/server-only$/ }, () => ({
            path: "boundary",
            namespace: "test",
          }));
          builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({
            contents: "",
            loader: "js",
          }));
        },
      },
    ],
  });
  const result = spawnSync(process.execPath, [file], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(file, { force: true });
}
