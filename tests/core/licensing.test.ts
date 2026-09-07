import { describe, expect, it } from "vitest";

// @ts-expect-error Node built-in module available in Vitest test runner
import fs from "node:fs";
// @ts-expect-error Node built-in module available in Vitest test runner
import path from "node:path";

describe("Repository Licensing & IP Contract", () => {
  // @ts-expect-error process.cwd is available in Node.js runtime
  const rootDir = process.cwd();

  it("ensures root LICENSE exists and contains MIT License declaration", () => {
    const licensePath = path.join(rootDir, "LICENSE");
    expect(fs.existsSync(licensePath)).toBe(true);

    const content = fs.readFileSync(licensePath, "utf-8");
    expect(content).toContain("MIT License");
    expect(content).toContain("Copyright (c) 2026");
  });

  it("ensures docs/THIRD_PARTY_LICENSES.md exists and tracks dependencies", () => {
    const docPath = path.join(rootDir, "docs/THIRD_PARTY_LICENSES.md");
    expect(fs.existsSync(docPath)).toBe(true);

    const content = fs.readFileSync(docPath, "utf-8");
    expect(content).toContain("Runtime Dependencies");
    expect(content).toContain("Development & Tooling Dependencies");
    expect(content).toContain("react");
    expect(content).toContain("typescript");
    expect(content).toContain("vite");
    expect(content).toContain("vitest");
  });

  it("ensures docs/COPYRIGHT_POLICY.md exists and specifies asset boundaries", () => {
    const docPath = path.join(rootDir, "docs/COPYRIGHT_POLICY.md");
    expect(fs.existsSync(docPath)).toBe(true);

    const content = fs.readFileSync(docPath, "utf-8");
    expect(content).toContain("Original Source Code");
    expect(content).toContain("Third-Party Dependencies");
    expect(content).toContain("Game Rules and Concepts");
    expect(content).toContain("External AI & Chess Engines");
  });

  it("ensures README.md links to licensing and IP governance documents", () => {
    const readmePath = path.join(rootDir, "README.md");
    const content = fs.readFileSync(readmePath, "utf-8");

    expect(content).toContain("## License");
    expect(content).toContain("LICENSE");
    expect(content).toContain("THIRD_PARTY_LICENSES.md");
    expect(content).toContain("COPYRIGHT_POLICY.md");
  });

  it("ensures package.json specifies MIT license", () => {
    const pkgPath = path.join(rootDir, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

    expect(pkg.license).toBe("MIT");
    expect(pkg.description).toBeDefined();
  });
});
