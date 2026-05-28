import axios from "axios";

export function makeClient(config) {
  const http = axios.create({
    headers: { Authorization: config.authHeader },
    timeout: 30000,
    validateStatus: s => s >= 200 && s < 300,
  });

  const groupPath = (g) => g.replace(/\./g, "/");

  return {
    async fetchMetadata(groupId, artifactId) {
      const url = `${config.url}/${groupPath(groupId)}/${artifactId}/maven-metadata.xml`;
      const { data } = await http.get(url, { responseType: "text" });
      return data;
    },

    async fetchPom(groupId, artifactId, version) {
      const url = `${config.url}/${groupPath(groupId)}/${artifactId}/${version}/${artifactId}-${version}.pom`;
      const { data } = await http.get(url, { responseType: "text" });
      return data;
    },

    async listFolder(groupId) {
      const { base, repo } = parseBaseAndRepo(config.url);
      const url = `${base}/api/storage/${repo}/${groupPath(groupId)}`;
      const { data } = await http.get(url, { responseType: "json" });
      return data;
    },
  };
}

function parseBaseAndRepo(fullUrl) {
  const m = fullUrl.match(/^(https?:\/\/[^/]+\/artifactory)\/([^/]+(?:\/[^/]+)*)$/);
  if (!m) {
    throw new Error(
      `Cannot derive Artifactory base + repo from ARTIFACTORY_URL=${fullUrl}. ` +
      `Expected format: https://host/artifactory/<repo-key>`
    );
  }
  return { base: m[1], repo: m[2] };
}
