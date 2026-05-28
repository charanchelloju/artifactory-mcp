import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { DOMParser } from "@xmldom/xmldom";

const SERVER_ID = process.env.ARTIFACTORY_SERVER_ID || "artifactory";

export function loadConfig() {
  const settingsPath = path.join(os.homedir(), ".m2", "settings.xml");

  let creds = readEnvCreds();
  let url = process.env.ARTIFACTORY_URL?.trim();

  if (!creds || !url) {
    if (!fs.existsSync(settingsPath)) {
      throw new Error(
        `Could not find credentials. ${settingsPath} does not exist and ` +
        `ARTIFACTORY_URL/ARTIFACTORY_USERNAME/ARTIFACTORY_TOKEN env vars are not set.`
      );
    }

    const xml = fs.readFileSync(settingsPath, "utf8");
    const doc = new DOMParser().parseFromString(xml, "text/xml");

    if (!creds) creds = readSettingsCreds(doc);
    if (!url) url = discoverArtifactoryUrl(doc);
  }

  if (!url) {
    throw new Error(
      "Could not discover Artifactory URL. Set ARTIFACTORY_URL env var or " +
      "configure a <mirror> / <repository> in ~/.m2/settings.xml."
    );
  }
  if (!creds) {
    throw new Error(
      `Could not find credentials. Set ARTIFACTORY_USERNAME and ARTIFACTORY_TOKEN ` +
      `env vars, or configure a <server id="${SERVER_ID}"> block in ~/.m2/settings.xml.`
    );
  }

  url = url.replace(/\/+$/, "");
  const authHeader =
    "Basic " + Buffer.from(`${creds.username}:${creds.password}`).toString("base64");

  return { url, authHeader };
}

function readEnvCreds() {
  const username = process.env.ARTIFACTORY_USERNAME?.trim();
  const password = process.env.ARTIFACTORY_TOKEN?.trim() || process.env.ARTIFACTORY_PASSWORD?.trim();
  if (username && password) return { username, password };
  return null;
}

function readSettingsCreds(doc) {
  const servers = Array.from(doc.getElementsByTagName("server"));
  const srv = servers.find(s => textOf(s, "id") === SERVER_ID);
  if (!srv) return null;

  const username = textOf(srv, "username");
  const password = textOf(srv, "password");
  if (!username || !password) return null;

  if (/^\{.+\}$/.test(password)) {
    throw new Error(
      `<server id="${SERVER_ID}"> in settings.xml uses a Maven-encrypted password ({...}). ` +
      `Decryption via settings-security.xml is not supported. ` +
      `Provide a plaintext password in settings.xml or set ARTIFACTORY_TOKEN env var.`
    );
  }
  return { username, password };
}

function discoverArtifactoryUrl(doc) {
  const mirrors = Array.from(doc.getElementsByTagName("mirror"));
  const mirror = mirrors.find(m =>
    textOf(m, "id") === SERVER_ID || /\*|central/.test(textOf(m, "mirrorOf") || "")
  );
  if (mirror) {
    const u = textOf(mirror, "url");
    if (u) return u;
  }

  const repos = Array.from(doc.getElementsByTagName("repository"));
  const repo = repos.find(r => /artifactory/i.test(textOf(r, "url") || ""));
  if (repo) return textOf(repo, "url");

  return null;
}

function textOf(node, tag) {
  const el = node.getElementsByTagName(tag)[0];
  return el?.textContent?.trim() ?? "";
}
