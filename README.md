# artifactory-mcp

A Model Context Protocol (MCP) server that gives AI assistants like Claude Desktop or VS Code Copilot Chat the ability to query Maven artifacts in a JFrog Artifactory.

Reuses the same credentials Maven already uses (`~/.m2/settings.xml`) — no tokens passed via CLI args, no duplicate config, single source of truth.

## Features

- **Reads credentials from `~/.m2/settings.xml`** by default — no `--artifactory-token` CLI arg, nothing in process listings
- **Looks up the latest stable Maven version** (excludes SNAPSHOT, alpha, beta, RC, milestone)
- **Wraps `mvn versions:*`** for `check_dependency_updates` — correct parent-chain and BOM resolution, reports plugin and property updates as well as dependency updates
- **Uses the JFrog `/api/storage/` REST API** for directory listings — works even when HTML browsing is disabled
- **Works with Claude Desktop, VS Code Copilot, Cursor, and any MCP-compatible client**

## Prerequisites

- Node.js 18 or higher
- npm
- Maven on `PATH` (used by `check_version_exists`, `check_dependency_updates`, and `get_pom` when `effective: true`)
- Either a configured `<server id="artifactory">` block in `~/.m2/settings.xml` **OR** the `ARTIFACTORY_*` environment variables (see below)

## Installation

```bash
git clone <repo-url> artifactory-mcp
cd artifactory-mcp
npm install
```

No build step — the server runs directly from `src/index.js`.

## Configuration

The server resolves credentials and the Artifactory URL in this order:

1. **Env vars** — `ARTIFACTORY_URL`, `ARTIFACTORY_USERNAME`, `ARTIFACTORY_TOKEN` (or `ARTIFACTORY_PASSWORD`). If all are set, they're used directly.
2. **`~/.m2/settings.xml`** — `<server id="artifactory">` for credentials, plus `<mirror>` or `<repository>` for the URL.

Override the server id with `ARTIFACTORY_SERVER_ID` (defaults to `artifactory`).

> Maven-encrypted passwords (`{...}` syntax) are **not** supported. Use a plaintext token in `settings.xml` or set `ARTIFACTORY_TOKEN`.

### Claude Desktop

Open Claude Desktop → Settings → Developer → Edit MCP configuration, and add:

```json
{
  "mcpServers": {
    "artifactory": {
      "command": "node",
      "args": ["/absolute/path/to/artifactory-mcp/src/index.js"],
      "type": "stdio"
    }
  }
}
```

Credentials come from `~/.m2/settings.xml` — no env vars or args needed.

### VS Code (Copilot Chat / MCP extension)

Add to `%APPDATA%\Code\User\mcp.json` (Windows) or `~/.config/Code/User/mcp.json` (Linux/macOS):

```json
{
  "servers": {
    "artifactory": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/artifactory-mcp/src/index.js"]
    }
  }
}
```

### Override (optional)

To point at a different Artifactory instance or use a different `<server>` id:

```json
{
  "servers": {
    "artifactory": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/artifactory-mcp/src/index.js"],
      "env": {
        "ARTIFACTORY_URL": "https://your-artifactory.example.com/artifactory/repo-key",
        "ARTIFACTORY_SERVER_ID": "my-artifactory"
      }
    }
  }
}
```

Tokens passed via `env` (not CLI args) stay out of process listings.

## Available Tools

### `get_metadata`

Fetch the full `maven-metadata.xml` for an artifact.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `groupId` | string | yes | Maven groupId (e.g. `org.apache.commons`) |
| `artifactId` | string | yes | Maven artifactId (e.g. `commons-lang3`) |

### `get_latest_stable_version`

Return the latest stable version of an artifact — excludes SNAPSHOT, alpha, beta, RC, and milestone builds.

| Parameter | Type | Required |
|-----------|------|----------|
| `groupId` | string | yes |
| `artifactId` | string | yes |

### `check_version_exists`

Verify whether a specific artifact version exists in Artifactory.

| Parameter | Type | Required |
|-----------|------|----------|
| `groupId` | string | yes |
| `artifactId` | string | yes |
| `version` | string | yes |

### `list_artifacts`

List artifacts under a Maven `groupId`. Uses JFrog's `/api/storage/` REST endpoint.

| Parameter | Type | Required |
|-----------|------|----------|
| `groupId` | string | yes |

### `get_pom`

Get the raw POM XML, or the effective POM with parent/BOM resolution applied.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `groupId` | string | yes | |
| `artifactId` | string | yes | |
| `version` | string | yes | |
| `effective` | boolean | no | If `true`, runs `mvn help:effective-pom` to resolve parent/BOM/property chains |

### `check_dependency_updates`

Run a dependency update report. Wraps `mvn versions:display-dependency-updates`, `versions:display-plugin-updates`, and `versions:display-property-updates`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `groupId` | string | yes* | For an Artifactory-hosted artifact |
| `artifactId` | string | yes* | For an Artifactory-hosted artifact |
| `version` | string | yes* | For an Artifactory-hosted artifact |
| `projectPath` | string | yes* | For a local Maven project directory (mutually exclusive with the above) |

\* Provide either `(groupId, artifactId, version)` or `projectPath`.

## Usage Examples (with an AI assistant)

```
What is the latest stable version of org.apache.commons:commons-lang3?
```

```
Does version 3.14.0 of commons-lang3 exist in our Artifactory?
```

```
List all artifacts under org.apache.logging.log4j
```

```
Show me the effective POM for org.apache.commons:commons-lang3:3.14.0
```

```
Check for dependency updates in the project at C:/path/to/my-project
```

## Notes & Caveats

- **Stable-version filter.** `get_latest_stable_version` excludes pre-release tags like `-SNAPSHOT`, `-alpha`, `-beta`, `-RC`, `-M1`, `-M2`, etc. If you want the absolute latest including pre-releases, use `get_metadata` and pick from the full list.
- **Effective POM is slow.** `get_pom` with `effective: true` runs Maven, which downloads parent POMs and BOM artifacts. First-time runs against a cold local repo can take 30+ seconds.
- **Maven required for `check_dependency_updates`.** This tool spawns `mvn` — make sure Maven 3.x is on `PATH`.

## Security

- **Use a token, not a password.** Generate an identity token in Artifactory and put it in `~/.m2/settings.xml` `<password>` (or `ARTIFACTORY_TOKEN`).
- **Don't commit `settings.xml`.** Treat it like a credential file.
- **No Maven password encryption.** This server does not decrypt `{...}` encrypted passwords from `settings.xml`. Use plaintext tokens or env vars.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Could not find credentials` | Set `ARTIFACTORY_USERNAME` + `ARTIFACTORY_TOKEN` env vars, or add a `<server id="artifactory">` block to `~/.m2/settings.xml` |
| `Could not discover Artifactory URL` | Set `ARTIFACTORY_URL` env var or configure a `<mirror>` / `<repository>` in `settings.xml` |
| `Maven-encrypted password not supported` | Replace the `{...}` encrypted password with a plaintext token, or use `ARTIFACTORY_TOKEN` env var |
| `mvn: command not found` | Install Maven 3.x and ensure it's on `PATH` (needed for `check_dependency_updates`, `check_version_exists`, and `get_pom effective: true`) |
| `Bitbucket API error 401` / Artifactory 401 | Token is wrong or expired — regenerate in Artifactory UI |

## Development

```bash
npm start   # runs node src/index.js
```

Source lives in [`src/`](src/). Tools register themselves into the MCP server via the `registerXxx(server, config)` pattern.
