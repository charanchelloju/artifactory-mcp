import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const exec = promisify(execFile);
const MAX_BUFFER = 32 * 1024 * 1024;

export async function checkArtifactExists(groupId, artifactId, version) {
  try {
    await exec(
      "mvn",
      ["-B", "-q", "dependency:get", `-Dartifact=${groupId}:${artifactId}:${version}`, "-Dtransitive=false"],
      { maxBuffer: MAX_BUFFER, shell: process.platform === "win32" }
    );
    return true;
  } catch {
    return false;
  }
}

export async function getEffectivePom(groupId, artifactId, version) {
  const { stdout } = await exec(
    "mvn",
    ["-B", "-q", "help:effective-pom", `-Dartifact=${groupId}:${artifactId}:${version}`],
    { maxBuffer: MAX_BUFFER, shell: process.platform === "win32" }
  );
  return stdout;
}

export async function dependencyUpdatesForPom(rawPomXml) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "artifactory-mcp-"));
  const pomFile = path.join(dir, "pom.xml");
  try {
    await writeFile(pomFile, rawPomXml);
    const { stdout } = await exec(
      "mvn",
      [
        "-B", "-N",
        "-f", pomFile,
        "versions:display-dependency-updates",
        "versions:display-plugin-updates",
        "versions:display-property-updates",
      ],
      { maxBuffer: MAX_BUFFER, shell: process.platform === "win32" }
    );
    return parseVersionsPluginOutput(stdout);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function dependencyUpdatesForProject(projectDir) {
  const { stdout } = await exec(
    "mvn",
    [
      "-B",
      "versions:display-dependency-updates",
      "versions:display-plugin-updates",
      "versions:display-property-updates",
    ],
    { cwd: projectDir, maxBuffer: MAX_BUFFER, shell: process.platform === "win32" }
  );
  return parseVersionsPluginOutput(stdout);
}

function parseVersionsPluginOutput(stdout) {
  const result = { dependencies: [], plugins: [], properties: [] };
  let section = null;

  const sectionMatchers = [
    [/dependencies in (?:Dependencies|Dependency Management) have newer versions/i, "dependencies"],
    [/plugin updates are available/i, "plugins"],
    [/properties? updates? available/i, "properties"],
  ];

  const updateLine = /^\[INFO\]\s+(\S+(?::\S+)?)\s*\.+\s*(\S+)\s*->\s*(\S+)\s*$/;

  for (const line of stdout.split(/\r?\n/)) {
    const matched = sectionMatchers.find(([re]) => re.test(line));
    if (matched) {
      section = matched[1];
      continue;
    }
    if (!section) continue;
    if (/^\[INFO\]\s*$/.test(line) || /^\[INFO\]\s+-+\s*$/.test(line)) continue;

    const m = line.match(updateLine);
    if (m) {
      result[section].push({ id: m[1], current: m[2], latest: m[3] });
    }
  }

  return result;
}
