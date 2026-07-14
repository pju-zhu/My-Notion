/**
 * Installs external skill packs into `.cursor/skills/` for Cursor discovery.
 *
 * 1) anthropics/skills — each `skills/<name>/` with SKILL.md → `.cursor/skills/<name>/`
 * 2) garrytan/gstack — repo root (SKILL.md + AGENTS.md, CLAUDE.md, …) → `.cursor/skills/gstack/`
 * 3) FrancyJGLisboa/agent-skill-creator — repo root → `.cursor/skills/agent-skill-creator/`
 *
 * Run: node scripts/setup-cursor-skills.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const skillsDestRoot = path.join(root, ".cursor", "skills");

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

function cloneOrPull(vendorDir, cloneUrl) {
  if (!fs.existsSync(path.join(vendorDir, ".git"))) {
    fs.mkdirSync(path.dirname(vendorDir), { recursive: true });
    run(`git clone --depth 1 "${cloneUrl}" "${vendorDir}"`);
  } else {
    run(`git -C "${vendorDir}" pull --ff-only`);
  }
}

function removeDest(dest) {
  try {
    fs.unlinkSync(dest);
  } catch {
    /* ignore */
  }
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
}

function linkDirectory(src, dest) {
  removeDest(dest);
  if (process.platform === "win32") {
    fs.symlinkSync(src, dest, "junction");
  } else {
    const rel = path.relative(path.dirname(dest), src);
    fs.symlinkSync(rel, dest, "dir");
  }
  console.log(`Linked ${path.relative(root, dest)} -> ${src}`);
}

fs.mkdirSync(skillsDestRoot, { recursive: true });

// --- 1) Anthropic skills (multi-skill repo) ---
const anthropicVendor = path.join(root, ".cursor", "vendor", "anthropics-skills");
const anthropicSkillsSrc = path.join(anthropicVendor, "skills");
cloneOrPull(anthropicVendor, "https://github.com/anthropics/skills.git");

let anthropicCount = 0;
const anthropicNames = fs
  .readdirSync(anthropicSkillsSrc, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const name of anthropicNames) {
  const src = path.join(anthropicSkillsSrc, name);
  const dest = path.join(skillsDestRoot, name);
  if (!fs.existsSync(path.join(src, "SKILL.md"))) continue;
  linkDirectory(src, dest);
  anthropicCount++;
}
console.log(`\nAnthropic: ${anthropicCount} skills linked.`);

// --- 2) Single-folder repos: entire clone → one Cursor skill folder ---
const singleRepoSkills = [
  {
    destName: "gstack",
    cloneUrl: "https://github.com/garrytan/gstack.git",
    vendorDir: path.join(root, ".cursor", "vendor", "gstack"),
    description: "Garry Tan gstack (Claude Code / agent workflows, SKILL.md at repo root)",
  },
  {
    destName: "agent-skill-creator",
    cloneUrl: "https://github.com/FrancyJGLisboa/agent-skill-creator.git",
    vendorDir: path.join(root, ".cursor", "vendor", "agent-skill-creator"),
    description:
      "Cross-tool agent skill authoring (SKILL.md + references/scripts at repo root)",
  },
];

for (const { destName, cloneUrl, vendorDir, description } of singleRepoSkills) {
  console.log(`\n--- ${destName}: ${description}`);
  cloneOrPull(vendorDir, cloneUrl);
  const skillMd = path.join(vendorDir, "SKILL.md");
  if (!fs.existsSync(skillMd)) {
    console.warn(`Warning: no SKILL.md at ${skillMd}; link still created for docs.`);
  }
  linkDirectory(vendorDir, path.join(skillsDestRoot, destName));
}

console.log("\nAll done. Use skills via @ .cursor/skills/<name>/SKILL.md or natural language.");
