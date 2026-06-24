import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { spawn } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 30_000;
const FALLBACK_OBSIDIAN_PATH = "/Applications/Obsidian.app/Contents/MacOS/obsidian";

const DANGEROUS_COMMANDS = new Set([
	"eval",
	"dev:cdp",
	"dev:debug",
	"restart",
]);

type ToolParams = {
	command: string;
	params?: Record<string, string>;
	flags?: string[];
	vault?: string;
	allowDangerous?: boolean;
	timeoutMs?: number;
	raw?: boolean;
};

function isValidToken(input: string): boolean {
	return /^[a-z0-9:_-]+$/i.test(input);
}

function buildArgs(input: ToolParams): string[] {
	const args: string[] = [];

	if (input.vault?.trim()) {
		args.push(`vault=${input.vault.trim()}`);
	}

	args.push(input.command.trim());

	for (const [key, value] of Object.entries(input.params ?? {})) {
		if (!key.trim()) continue;
		args.push(`${key}=${value}`);
	}

	for (const flag of input.flags ?? []) {
		if (!flag.trim()) continue;
		args.push(flag.trim());
	}

	return args;
}

async function runObsidian(args: string[], signal?: AbortSignal, timeoutMs = DEFAULT_TIMEOUT_MS) {
	return await runProcess("obsidian", args, signal, timeoutMs).catch(async (error: any) => {
		if (error?.code === "ENOENT") {
			return await runProcess(FALLBACK_OBSIDIAN_PATH, args, signal, timeoutMs);
		}
		throw error;
	});
}

function runProcess(binary: string, args: string[], signal?: AbortSignal, timeoutMs = DEFAULT_TIMEOUT_MS) {
	return new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
		const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });
		let stdout = "";
		let stderr = "";

		const timer = setTimeout(() => {
			child.kill("SIGTERM");
			reject(new Error(`Obsidian CLI timed out after ${timeoutMs}ms`));
		}, timeoutMs);

		const onAbort = () => {
			child.kill("SIGTERM");
			reject(new Error("Tool call aborted"));
		};

		signal?.addEventListener("abort", onAbort, { once: true });

		child.stdout.on("data", (chunk) => {
			stdout += String(chunk);
		});

		child.stderr.on("data", (chunk) => {
			stderr += String(chunk);
		});

		child.on("error", (err: any) => {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
			reject(err);
		});

		child.on("close", (code) => {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
			resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code });
		});
	});
}

export default function obsidianCliExtension(pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		ctx.ui.notify("Obsidian CLI extension loaded (tool: obsidian_cli)", "info");
	});

	pi.registerTool({
		name: "obsidian_cli",
		label: "Obsidian CLI",
		description: "Run Obsidian CLI commands with structured parameters (command, params, flags, vault).",
		promptSnippet:
			"Use this tool to manage Obsidian vaults (read/create/search notes, tasks, tags, properties, plugins, themes).",
		promptGuidelines: [
			"Prefer params as key/value pairs (e.g. query=todo, file=My Note).",
			"Use flags for boolean options (e.g. total, verbose, overwrite).",
			"Use vault to target non-active vaults.",
		],
		parameters: Type.Object({
			command: Type.String({ description: "Obsidian CLI command, e.g. read, create, search, tasks, tags, plugin:reload" }),
			params: Type.Optional(
				Type.Record(Type.String(), Type.String(), {
					description: "Command parameters rendered as key=value",
				}),
			),
			flags: Type.Optional(
				Type.Array(
					Type.String({ description: "Boolean flags (e.g. total, verbose, overwrite, done)" }),
				),
			),
			vault: Type.Optional(Type.String({ description: "Target vault name (vault=<name>)" })),
			allowDangerous: Type.Optional(
				Type.Boolean({
					description:
						"Required for dangerous commands like eval/dev:cdp/dev:debug/restart. Default false.",
				}),
			),
			timeoutMs: Type.Optional(Type.Number({ description: `Timeout in milliseconds (default ${DEFAULT_TIMEOUT_MS})` })),
			raw: Type.Optional(Type.Boolean({ description: "Return raw stdout/stderr only" })),
		}),

		async execute(_toolCallId, params, signal) {
			const input = params as ToolParams;
			const command = input.command?.trim();

			if (!command || !isValidToken(command)) {
				return {
					content: [{ type: "text", text: "Invalid command. Use only letters, numbers, :, _, -." }],
					details: { ok: false },
				};
			}

			for (const flag of input.flags ?? []) {
				if (!isValidToken(flag)) {
					return {
						content: [{ type: "text", text: `Invalid flag: ${flag}` }],
						details: { ok: false },
					};
				}
			}

			if (DANGEROUS_COMMANDS.has(command) && !input.allowDangerous) {
				return {
					content: [
						{
							type: "text",
							text: `Blocked dangerous command '${command}'. Re-run with allowDangerous=true if intentional.`,
						},
					],
					details: { ok: false, blocked: true, command },
				};
			}

			const args = buildArgs(input);
			const timeoutMs = Number.isFinite(input.timeoutMs) ? Math.max(1_000, Number(input.timeoutMs)) : DEFAULT_TIMEOUT_MS;

			try {
				const result = await runObsidian(args, signal, timeoutMs);
				const ok = result.code === 0;

				if (input.raw) {
					return {
						content: [{ type: "text", text: result.stdout || result.stderr || "" }],
						details: { ok, code: result.code, args },
					};
				}

				const lines = [
					`$ obsidian ${args.join(" ")}`,
					result.stdout ? `\n${result.stdout}` : "",
					result.stderr ? `\n[stderr]\n${result.stderr}` : "",
				].filter(Boolean);

				return {
					content: [{ type: "text", text: lines.join("\n") }],
					details: { ok, code: result.code, args, stdout: result.stdout, stderr: result.stderr },
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Failed to run Obsidian CLI: ${error?.message ?? String(error)}` }],
					details: { ok: false, error: String(error), args },
				};
			}
		},
	});
}
