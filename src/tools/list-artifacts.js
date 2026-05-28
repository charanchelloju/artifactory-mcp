import { z } from "zod";
import { makeClient } from "../artifactory-client.js";
import { errorReply } from "./_errors.js";

export function registerListArtifacts(server, config) {
  const client = makeClient(config);

  server.tool(
    "list_artifacts",
    "List all artifacts (subdirectories) under a given Maven groupId in the internal JFrog Artifactory. Uses JFrog's REST storage API.",
    {
      groupId: z.string().describe("Maven groupId (e.g. org.apache.logging.log4j)"),
    },
    async ({ groupId }) => {
      try {
        const data = await client.listFolder(groupId);
        const artifacts = (data.children || [])
          .filter(c => c.folder)
          .map(c => c.uri.replace(/^\//, ""));

        if (artifacts.length === 0) {
          return {
            content: [{ type: "text", text: `No artifacts found under ${groupId}` }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text",
            text: `Artifacts under ${groupId}:\n${artifacts.join("\n")}`,
          }],
        };
      } catch (err) {
        return errorReply(err);
      }
    }
  );
}
