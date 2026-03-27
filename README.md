# @haispeed/pi-obsidian

Shareable Pi package for Obsidian CLI workflows.

## Includes

- `extensions/obsidian-cli.ts` — registers tool `obsidian_cli`
- `skills/obsidian-cli/SKILL.md` — usage guidance for Obsidian CLI workflows
- `skills/obsidian-markdown/SKILL.md` — Obsidian Flavored Markdown authoring guidance (wikilinks, embeds, callouts, properties)
  - `skills/obsidian-markdown/references/PROPERTIES.md`
  - `skills/obsidian-markdown/references/EMBEDS.md`
  - `skills/obsidian-markdown/references/CALLOUTS.md`

## Install in Pi

From npm:

```bash
pi install npm:@haispeed/pi-obsidian
```

## Use

Start Pi, then ask for Obsidian operations (search, create, tasks, properties, plugins, etc.).

The extension tool accepts:

- `command` (required)
- `params` (key/value)
- `flags` (boolean switches)
- `vault` (vault name)
- `allowDangerous` (required for `eval`, `dev:cdp`, `dev:debug`, `restart`)

## Publish

```bash
npm publish --access public
```

## Requirements

- Obsidian desktop app running
- Obsidian CLI available (`obsidian`)
