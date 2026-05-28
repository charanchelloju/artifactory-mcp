import { z } from "zod";
import { makeClient } from "../artifactory-client.js";
import { dependencyUpdatesForPom, dependencyUpdatesForProject } from "../maven-runner.js";
import { errorReply } from "./_errors.js";

export function registerCheckDependencyUpdates(server, config) {
  const client = makeClient(config);

  server.tool(
    "check_dependency_updates",
    "Check for newer versions of dependencies. Provide either a (groupId, artifactId, version) for an artifact in Artifactory, or a projectPath to a local checked-out project. Reports dependency, plugin, and property updates.",
    {
      groupId: z.string().optional().describe("Maven groupId (when checking an Artifactory-hosted artifact)"),
      artifactId: z.string().optional().describe("Maven artifactId"),
      version: z.string().optional().describe("Version"),
      projectPath: z.string().optional().describe("Absolute path to a local Maven project (alternative to groupId/artifactId/version)"),
    },
    async ({ groupId, artifactId, version, projectPath }) => {
      try {
        let report;
        let header;

        if (projectPath) {
          report = await dependencyUpdatesForProject(projectPath);
          header = `Update report for project at ${projectPath}`;
        } else if (groupId && artifactId && version) {
          const pomXml = await client.fetchPom(groupId, artifactId, version);
          report = await dependencyUpdatesForPom(pomXml);
          header = `Update report for ${groupId}:${artifactId}:${version}`;
        } else {
          return {
            content: [{
              type: "text",
              text: "Provide either projectPath, or all of groupId/artifactId/version.",
            }],
            isError: true,
          };
        }

        const text = formatReport(header, report);
        return { content: [{ type: "text", text }] };
      } catch (err) {
        return errorReply(err);
      }
    }
  );
}

function formatReport(header, { dependencies, plugins, properties }) {
  const lines = [header, "=".repeat(header.length), ""];

  const renderSection = (title, items, idLabel = "GroupId:ArtifactId") => {
    lines.push(`## ${title}`);
    if (items.length === 0) {
      lines.push("No updates available.");
    } else {
      lines.push(`| ${idLabel} | Current | Latest |`);
      lines.push("|---|---|---|");
      for (const it of items) lines.push(`| ${it.id} | ${it.current} | ${it.latest} |`);
    }
    lines.push("");
  };

  renderSection("Dependency updates", dependencies);
  renderSection("Plugin updates", plugins);
  renderSection("Property updates", properties, "Property");

  return lines.join("\n");
}
