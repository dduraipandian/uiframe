import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import postcss from "rollup-plugin-postcss";
import path from "path";
import fs from "fs";

const publishSourceMap = process.env.PUBLISH_SOURCEMAP === "true";
const inputPKG = process.env.PKG;
const packagesDir = path.resolve(__dirname, "packages");
const packages = fs.readdirSync(packagesDir).filter((pkg) => {
  if (inputPKG && pkg !== inputPKG) return false;
  return fs.statSync(path.join(packagesDir, pkg)).isDirectory();
});

function iifeGuardPlugin(pkgName) {
  return {
    name: "iife-guard",
    renderChunk(code, chunk, options) {
      if (options.format !== "iife") return null;

      if (pkgName === "core")
        return `
                    (function () {
                        if (typeof window !== "undefined") {
                            window.uiframe = window.uiframe || {};
                        }
                    })();
                    ${code}
                `;
      else
        return `
                    (function () {
                        if (typeof window !== "undefined" && !window.uiframe) {
                            throw new Error(
                                "[uiframe] core must be loaded before ${pkgName}"
                            );
                        }
                    })();
                    ${code}
                `;
    },
  };
}

export default packages.map((pkg) => {
  const pkgPath = path.join(packagesDir, pkg);
  const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgPath, "package.json"), "utf-8"));

  const cssPlugin = postcss({
    extract: pkg === "core" ? "base.css" : `${pkg}.css`,
    minimize: true,
    sourceMap: publishSourceMap,
  });

  return {
    input: path.join(pkgPath, "index.js"),
    output: [
      {
        file: path.join(pkgPath, "dist/index.js"),
        format: "cjs",
        sourcemap: publishSourceMap,
      },
      {
        file: path.join(pkgPath, "dist/index.esm.js"),
        format: "esm",
        sourcemap: publishSourceMap,
      },
      {
        file: path.join(pkgPath, `dist/${pkg}.min.js`),
        format: "iife",
        name: "uiframe",
        extend: true,
        plugins: [iifeGuardPlugin(pkg), terser()],
        globals: { "@uiframe/core": "uiframe" },
      },
    ],
    external: [
      ...Object.keys(pkgJson.peerDependencies || {}),
      (id) => id.startsWith("@uiframe/") && id !== pkgJson.name,
    ],
    plugins: [resolve(), commonjs(), cssPlugin],
  };
});
