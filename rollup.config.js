import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import path from "path";
import fs from "fs";

const inputPKG = process.env.PKG;
const packagesDir = path.resolve(__dirname, "packages");
const packages = fs.readdirSync(packagesDir).filter((pkg) => {
    if (inputPKG && pkg !== inputPKG) return false;
    return fs.statSync(path.join(packagesDir, pkg)).isDirectory();
});

function capitalize(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
}

export default packages.map((pkg) => {
    const pkgPath = path.join(packagesDir, pkg);
    const pkgJson = JSON.parse(
        fs.readFileSync(path.join(pkgPath, "package.json"), "utf-8")
    );

    return {
        input: path.join(pkgPath, "index.js"),
        output: [
            {
                file: path.join(pkgPath, "dist/index.js"),
                format: "cjs",
                sourcemap: true,
            },
            {
                file: path.join(pkgPath, "dist/index.esm.js"),
                format: "esm",
                sourcemap: true,
            },
            {
                file: path.join(pkgPath, `dist/${pkg}.min.js`),
                format: "iife",
                name: pkg === "core" ? "UIFrameCore" : `UIFrame${capitalize(pkg)}`,
                plugins: [terser()],
                globals: (id) => {
                    if (id.startsWith("@uiframe/")) {
                        const name = id.split("/")[1];
                        return name === "core" ? "UIFrameCore" : `UIFrame${capitalize(name)}`;
                    }
                }
            },
        ],
        external: [
            ...Object.keys(pkgJson.peerDependencies || {}),
            (id) => id.startsWith("@uiframe/") && id !== pkgJson.name,
        ],
        plugins: [
            resolve(),
            commonjs(),
        ],
    };
});
