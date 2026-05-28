export function errorReply(err) {
  let text;
  if (err?.response) {
    const status = err.response.status;
    const body = typeof err.response.data === "string"
      ? err.response.data.slice(0, 500)
      : "";
    text = `HTTP ${status} from Artifactory${body ? `: ${body}` : ""}`;
    if (status === 401 || status === 403) {
      text += "\nCheck that your Artifactory token in ~/.m2/settings.xml is valid and not expired.";
    }
    if (status === 404) {
      text += "\nArtifact, version, or path not found.";
    }
  } else if (err?.code === "ENOENT") {
    text = "mvn not found on PATH. Install Maven or use a project-local mvnw wrapper.";
  } else {
    text = `Error: ${err?.message ?? String(err)}`;
  }
  return { content: [{ type: "text", text }], isError: true };
}
