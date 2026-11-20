import fs from "fs";
import path from "path";
import pkg from "../package.json";
import {
    DEFAULT_COCOS_ASSETS,
    DEFAULT_COCOS_COMPONENTS,
    DEFAULT_COCOS_ENUMS,
    IEcsSchemaProfile,
    IEngineEnumOption,
    IEngineTypeOption,
    IEngineTypesPayload,
    normalizeEcsSettings,
} from "./schema";
import { validateSchema } from "./validator";
import {
    generateComponentsDts,
    generateComponentsJs,
    generateDtoDts,
    generateDtoTs,
    generateWorldsDts,
    generateWorldsJs,
} from "./codegen";
import type { ISceneEnumItem, ISceneTypeItem } from "./scene";

const PKG_NAME = pkg.name;
const SECRET_DIR = path.resolve(__dirname, "..", "assets", "_$secret");
const SCRIPTS_DIR = path.resolve(__dirname, "..", "assets", "scripts");
const SECRET_DB = `db://${PKG_NAME}/_$secret`;
const SCRIPTS_DB = `db://${PKG_NAME}/scripts`;

const PLUGIN_FILES = ["ecs.js", "ecs.components.js", "ecs.worlds.js"] as const;

const PLUGIN_USER_DATA: Record<string, any> = {
    isPlugin: true,
    loadPluginInWeb: true,
    loadPluginInNative: true,
    loadPluginInEditor: true,
    loadPluginInPreview: true,
    loadPluginInMiniGame: true,
    executionScope: "enclosed",
    simulateGlobals: ["window", "self", "global"],
};

function checkPtsCoreDependency(): void {
    try {
        const corePath = path.resolve(Editor.Project.path, "extensions", "pts-core");
        if (!fs.existsSync(corePath)) {
            console.warn(
                `[${PKG_NAME}] Peer dependency "pts-core" not found at ${corePath}. ` +
                `Global "pTS" and "pFlex.TKey" types require pts-core.`
            );
        }
    } catch {}
}

async function readProfileSchema(): Promise<IEcsSchemaProfile> {
    const components = (await Editor.Profile.getProject(PKG_NAME, "components")) as any;
    const worlds = (await Editor.Profile.getProject(PKG_NAME, "worlds")) as any;
    const rawSettings = (await Editor.Profile.getProject(PKG_NAME, "settings")) as any;
    return {
        components: Array.isArray(components) ? components : [],
        worlds: Array.isArray(worlds) ? worlds : [],
        settings: normalizeEcsSettings(rawSettings),
    };
}

async function writeProfileSchema(schema: IEcsSchemaProfile): Promise<void> {
    await Editor.Profile.setProject(PKG_NAME, "components", schema.components);
    await Editor.Profile.setProject(PKG_NAME, "worlds", schema.worlds);
    await Editor.Profile.setProject(PKG_NAME, "settings", normalizeEcsSettings(schema.settings));
}

async function ensurePluginMeta(dbUrl: string): Promise<string | null> {
    try {
        await Editor.Message.request("asset-db", "refresh-asset", dbUrl);
        const meta = (await Editor.Message.request("asset-db", "query-asset-meta", dbUrl)) as any;
        if (!meta) return null;

        meta.userData = meta.userData || {};
        let dirty = false;
        for (const key of Object.keys(PLUGIN_USER_DATA)) {
            const expected = PLUGIN_USER_DATA[key];
            const current = meta.userData[key];
            const same = Array.isArray(expected)
                ? Array.isArray(current) &&
                  current.length === expected.length &&
                  current.every((v: any, idx: number) => v === expected[idx])
                : current === expected;
            if (!same) {
                meta.userData[key] = expected;
                dirty = true;
            }
        }

        if (dirty) {
            await Editor.Message.request("asset-db", "save-asset-meta", meta.uuid, JSON.stringify(meta));
            await Editor.Message.request("asset-db", "refresh-asset", dbUrl);
        }
        return meta.uuid || null;
    } catch (err) {
        console.warn(`[${PKG_NAME}] Failed to ensure plugin meta for ${dbUrl}:`, err);
        return null;
    }
}

async function ensurePluginSorting(ecsPluginUuids: string[]): Promise<void> {
    if (ecsPluginUuids.length === 0) return;
    try {
        // Keep pts-core plugins pinned BEFORE pts-ecs plugins
        const coreAssets = (await Editor.Message.request("asset-db", "query-assets", {
            pattern: "db://pts-core/plugins/**/*.js",
        })) as any[];
        const coreUuids = Array.isArray(coreAssets)
            ? coreAssets.map((a) => a?.uuid).filter(Boolean)
            : [];

        const sortingList = (await Editor.Profile.getProject("project", "script.sortingPlugin")) as string[] | undefined;
        const current = Array.isArray(sortingList) ? sortingList : [];

        const ecsSet = new Set(ecsPluginUuids);
        const coreSet = new Set(coreUuids);
        const rest = current.filter((u) => !ecsSet.has(u) && !coreSet.has(u));

        const ordered = [...coreUuids, ...ecsPluginUuids, ...rest];
        const unchanged =
            ordered.length === current.length &&
            ordered.every((u, idx) => u === current[idx]);
        if (!unchanged) {
            await Editor.Profile.setProject("project", "script.sortingPlugin", ordered);
        }
    } catch (err) {
        console.warn(`[${PKG_NAME}] Failed to update script.sortingPlugin:`, err);
    }
}

async function regenerateAll(schema?: IEcsSchemaProfile): Promise<{ ok: boolean; errors?: string[] }> {
    const data = schema || (await readProfileSchema());
    const validation = validateSchema(data);
    if (!validation.ok) {
        return { ok: false, errors: validation.errors };
    }

    if (!fs.existsSync(SECRET_DIR)) {
        fs.mkdirSync(SECRET_DIR, { recursive: true });
    }
    if (!fs.existsSync(SCRIPTS_DIR)) {
        fs.mkdirSync(SCRIPTS_DIR, { recursive: true });
    }

    const settings = normalizeEcsSettings(data.settings);
    const compJsPath = path.join(SECRET_DIR, "ecs.components.js");
    const compDtsPath = path.join(SECRET_DIR, "ecs.components.d.ts");
    const worldJsPath = path.join(SECRET_DIR, "ecs.worlds.js");
    const worldDtsPath = path.join(SECRET_DIR, "ecs.worlds.d.ts");
    const dtoTsPath = path.join(SCRIPTS_DIR, "ecs.dto.ts");
    const dtoDtsPath = path.join(SECRET_DIR, "ecs.dto.d.ts");

    fs.writeFileSync(compJsPath, generateComponentsJs(data.components), "utf8");
    fs.writeFileSync(compDtsPath, generateComponentsDts(data.components), "utf8");
    fs.writeFileSync(worldJsPath, generateWorldsJs(data.worlds), "utf8");
    fs.writeFileSync(worldDtsPath, generateWorldsDts(data.worlds), "utf8");
    fs.writeFileSync(dtoTsPath, generateDtoTs(data.components, settings), "utf8");
    fs.writeFileSync(dtoDtsPath, generateDtoDts(data.components, settings), "utf8");

    // Refresh .d.ts declarations & generated DTO script
    await Editor.Message.request("asset-db", "refresh-asset", `${SECRET_DB}/ecs.d.ts`).catch(() => {});
    await Editor.Message.request("asset-db", "refresh-asset", `${SECRET_DB}/ecs.components.d.ts`).catch(() => {});
    await Editor.Message.request("asset-db", "refresh-asset", `${SECRET_DB}/ecs.worlds.d.ts`).catch(() => {});
    await Editor.Message.request("asset-db", "refresh-asset", `${SECRET_DB}/ecs.dto.d.ts`).catch(() => {});
    await Editor.Message.request("asset-db", "refresh-asset", `${SCRIPTS_DB}/ecs.dto.ts`).catch(() => {});

    // Ensure all 3 core/generated .js files are marked as plugins & sorted in order
    const pluginUuids: string[] = [];
    for (const file of PLUGIN_FILES) {
        const uuid = await ensurePluginMeta(`${SECRET_DB}/${file}`);
        if (uuid) pluginUuids.push(uuid);
    }
    await ensurePluginSorting(pluginUuids);

    console.log(
        `[${PKG_NAME}] Generated ${data.components.length} component(s) & ${data.worlds.length} world(s) in _$secret/.`
    );
    return { ok: true };
}

function buildFallbackEngineTypes(): IEngineTypesPayload {
    return {
        nodes: [{ name: "cc.Node", ctorName: "Node", category: "node", isBuiltin: true, tsType: 'import("cc").Node' }],
        components: DEFAULT_COCOS_COMPONENTS.map((n) => {
            const short = n.slice(3);
            return { name: n, ctorName: short, category: "component", isBuiltin: true, tsType: `import("cc").${short}` };
        }),
        assets: DEFAULT_COCOS_ASSETS.map((n) => {
            const short = n.slice(3);
            return { name: n, ctorName: short, category: "asset", isBuiltin: true, tsType: `import("cc").${short}` };
        }),
        enums: DEFAULT_COCOS_ENUMS.map((e) => ({ ...e, members: [...e.members] })),
    };
}

async function resolveCustomTsType(item: ISceneTypeItem): Promise<string> {
    if (item.isBuiltin || !item.cid) return item.tsType;
    try {
        const fullUuid: string =
            (Editor as any).Utils?.UUID?.decompressUUID?.(item.cid) || item.cid;
        const info = (await Editor.Message.request("asset-db", "query-asset-info", fullUuid)) as any;
        if (info && typeof info.url === "string" && info.url.endsWith(".ts")) {
            const modUrl = info.url.replace(/\.ts$/, "");
            return `import(${JSON.stringify(modUrl)}).${item.ctorName}`;
        }
    } catch {}
    return item.tsType;
}

async function queryAllEngineTypes(): Promise<IEngineTypesPayload> {
    const fallback = buildFallbackEngineTypes();
    try {
        // Query AssetDB metadata for project .ts script URLs (pure metadata query — zero file reading!)
        let scriptUrls: string[] = [];
        try {
            const scriptAssets = (await Editor.Message.request("asset-db", "query-assets", {
                pattern: "db://assets/**/*.ts",
            })) as any[];
            if (Array.isArray(scriptAssets)) {
                scriptUrls = scriptAssets
                    .map((a) => a?.url)
                    .filter((u): u is string => typeof u === "string" && !u.endsWith(".d.ts"));
            }
        } catch {}

        const res = (await Editor.Message.request("scene", "execute-scene-script", {
            name: PKG_NAME,
            method: "listEngineTypes",
            args: [scriptUrls],
        })) as {
            components: ISceneTypeItem[];
            assets: ISceneTypeItem[];
            enums: ISceneEnumItem[];
        } | null;

        if (!res || (!res.components?.length && !res.assets?.length && !res.enums?.length)) {
            return fallback;
        }

        const enrich = async (items: ISceneTypeItem[]): Promise<IEngineTypeOption[]> => {
            const out: IEngineTypeOption[] = [];
            for (const item of items) {
                const tsType = item.isBuiltin ? item.tsType : await resolveCustomTsType(item);
                out.push({
                    name: item.name,
                    ctorName: item.ctorName,
                    category: item.category,
                    isBuiltin: item.isBuiltin,
                    tsType,
                });
            }
            return out;
        };

        const enums: IEngineEnumOption[] = Array.isArray(res.enums) && res.enums.length > 0
            ? res.enums
            : fallback.enums;

        return {
            nodes: fallback.nodes,
            components: await enrich(res.components || []),
            assets: await enrich(res.assets || []),
            enums,
        };
    } catch {
        return fallback;
    }
}

export function load(): void {
    checkPtsCoreDependency();
    void regenerateAll();
}

export function unload(): void {}

function notifyPanelUpdate(schema?: IEcsSchemaProfile): void {
    try {
        // Strictly fire-and-forget (non-blocking) so MCP/headless callers never wait on UI updates
        Editor.Message.send(PKG_NAME, "request_to_update_panel", schema);
    } catch {}
}

export const methods: Record<string, (...args: any[]) => any> = {
    openPanel() {
        Editor.Panel.open(PKG_NAME);
    },

    async onAssetDbReady() {
        await regenerateAll();
    },

    async regenerate() {
        const res = await regenerateAll();
        if (res.ok) notifyPanelUpdate();
        return res;
    },

    async getSchema(): Promise<IEcsSchemaProfile> {
        return await readProfileSchema();
    },

    async saveSchema(schema: IEcsSchemaProfile): Promise<{ ok: boolean; errors?: string[] }> {
        const validation = validateSchema(schema);
        if (!validation.ok) {
            return { ok: false, errors: validation.errors };
        }
        await writeProfileSchema(schema);
        const res = await regenerateAll(schema);
        if (res.ok) notifyPanelUpdate(schema);
        return res;
    },

    async listEngineTypes(): Promise<IEngineTypesPayload> {
        return await queryAllEngineTypes();
    },
};
