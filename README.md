# pi-obsidian

Shareable Pi package for Obsidian CLI workflows.

## Includes

- `extensions/obsidian-cli.ts` — registers tool `obsidian_cli`
- `skills/obsidian-cli/SKILL.md` — usage guidance for Obsidian CLI workflows
- `skills/obsidian-markdown/SKILL.md` — Obsidian Flavored Markdown authoring guidance (wikilinks, embeds, callouts, properties)

## Install in Pi

From a local path:

```bash
pi install .
```

Or in a project:

```bash
pi install -l .
```

## Use

Start Pi, then ask for Obsidian operations (search, create, tasks, properties, plugins, etc.).

The extension tool accepts:

- `command` (required)
- `params` (key/value)
- `flags` (boolean switches)
- `vault` (vault name)
- `allowDangerous` (required for `eval`, `dev:cdp`, `dev:debug`, `restart`)

## Requirements

- Obsidian desktop app running
- Obsidian CLI available (`obsidian`)
