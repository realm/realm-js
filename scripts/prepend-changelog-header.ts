import fs from "node:fs";
import path from "node:path";

const headerPath = path.resolve(__dirname, "../CHANGELOG.header.md");
const header = fs.readFileSync(headerPath, "utf8").trim();

const changelogPathInput = process.argv[2] || path.resolve(__dirname, "../CHANGELOG.md");
const changelogPath = path.resolve(changelogPathInput);

console.log(`Prepending header to ${changelogPath}`);
const changelog = fs.readFileSync(changelogPath, "utf8");
const prependedChangelog = header + "\n\n" + changelog;
fs.writeFileSync(changelogPath, prependedChangelog, "utf8");
