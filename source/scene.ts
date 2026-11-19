// Scene process bridge for pts-ecs: dynamically discovers ALL registered cc.Component, cc.Asset, and cc.Enum types
// purely from live V8/Engine runtime memory (cc, cce.Script._executor / Editor.Module, CCClass.Attr) — ZERO file reading!

declare const Editor: any;

export interface ISceneTypeItem {
    name: string;        // e.g. "cc.Sprite" or "Config_Enemy"
    ctorName: string;    // JS class name e.g. "Sprite" or "Config_Enemy"
    category: "component" | "asset";
    isBuiltin: boolean;
    cid: string;         // Cocos compressed script UUID (for custom scripts)
    tsType: string;      // Default TS type (e.g. `import("cc").Sprite`)
}

export interface ISceneEnumMember {
    name: string;
    value: number | string;
}

export interface ISceneEnumItem {
    name: string;        // e.g. "KeyCode", "EAnimState", "Sprite.Type"
    isBuiltin: boolean;
    tsType: string;      // e.g. `import("cc").KeyCode` or `import("db://...").EAnimState`
    members: ISceneEnumMember[];
}

// Tier 1: Hook cc.Enum in the Scene process so any future Enum(obj) call is captured in memory
const _hookedEnums = new Set<any>();

function installEnumHook(): void {
    const cc = (globalThis as any).cc;
    if (!cc || typeof cc.Enum !== "function" || (cc.Enum as any).__pts_ecs_hooked__) return;

    const origEnum = cc.Enum;
    const wrappedEnum: any = function (obj: any) {
        const res = origEnum(obj);
        if (res && typeof res === "object") {
            _hookedEnums.add(res);
        }
        return res;
    };
    Object.assign(wrappedEnum, origEnum);
    wrappedEnum.__pts_ecs_hooked__ = true;
    try {
        cc.Enum = wrappedEnum;
    } catch {}
}

function extractEnumMembers(cc: any, enumObj: any): ISceneEnumMember[] {
    if (!enumObj || typeof enumObj !== "object") return [];
    try {
        if (typeof cc.Enum?.getList === "function" && cc.Enum.isEnum(enumObj)) {
            const list = cc.Enum.getList(enumObj);
            if (Array.isArray(list) && list.length > 0) {
                return list.map((item: any) => ({
                    name: String(item.name),
                    value: typeof item.value === "number" || typeof item.value === "string" ? item.value : Number(item.value) || 0,
                }));
            }
        }
    } catch {}

    const out: ISceneEnumMember[] = [];
    for (const k of Object.keys(enumObj)) {
        if (k === "__enums__") continue;
        // Skip numeric reverse-mapping keys in TS numeric enums
        if (/^-?\d+$/.test(k)) continue;
        const v = enumObj[k];
        if (typeof v === "number" || typeof v === "string") {
            out.push({ name: k, value: v });
        }
    }
    return out;
}

export function load(): void {
    installEnumHook();
}

export function unload(): void {}

export const methods = {
    async listEngineTypes(scriptUrls?: string[]): Promise<{
        components: ISceneTypeItem[];
        assets: ISceneTypeItem[];
        enums: ISceneEnumItem[];
    }> {
        installEnumHook();
        const cc = (globalThis as any).cc;
        if (!cc || !cc.js) {
            return { components: [], assets: [], enums: [] };
        }

        const compMap = new Map<string, ISceneTypeItem>();
        const assetMap = new Map<string, ISceneTypeItem>();
        const enumMap = new Map<string, ISceneEnumItem>();
        const seenEnumObjs = new Map<any, string>(); // enumObj -> registered name

        const registerEnumObj = (
            enumObj: any,
            name: string,
            isBuiltin: boolean,
            tsType: string,
        ) => {
            if (!enumObj || typeof enumObj !== "object" || !name) return;
            const members = extractEnumMembers(cc, enumObj);
            if (members.length === 0) return;

            const existingName = seenEnumObjs.get(enumObj);
            if (existingName && enumMap.has(existingName)) {
                // Upgrade tsType if we now have an exact db:// or cc.* import path
                const prev = enumMap.get(existingName)!;
                if (prev.tsType === "number" && tsType !== "number") {
                    prev.tsType = tsType;
                }
                return;
            }
            seenEnumObjs.set(enumObj, name);
            enumMap.set(name, { name, isBuiltin, tsType, members });
        };

        const ComponentCtor = cc.Component;
        const AssetCtor = cc.Asset;
        const isChild = (ctor: any, base: any): boolean => {
            if (!ctor || !base || typeof ctor !== "function") return false;
            try {
                return ctor === base || cc.js.isChildClassOf(ctor, base);
            } catch {
                return false;
            }
        };
        const isRegisteredEnum = (val: any): boolean => {
            if (!val || typeof val !== "object") return false;
            try {
                return Boolean(cc.Enum?.isEnum?.(val)) || Object.prototype.hasOwnProperty.call(val, "__enums__");
            } catch {
                return false;
            }
        };

        // ─── 1. Scan all public `cc.*` exports (Components, Assets, and Tier-2 Top-Level + Static Class Enums) ───
        const ccKeys = Object.keys(cc);
        for (let i = 0; i < ccKeys.length; i++) {
            const key = ccKeys[i];
            if (!key || key.startsWith("_") || key[0] !== key[0].toUpperCase()) continue;
            let val: any;
            try {
                val = cc[key];
            } catch {
                continue;
            }
            if (!val) continue;

            // Tier 2A: Top-level cc.<EnumName> where Enum(cc.<EnumName>) was called (e.g. Enum(KeyCode)!)
            if (typeof val === "object" && isRegisteredEnum(val)) {
                registerEnumObj(val, key, true, `import("cc").${key}`);
                continue;
            }

            if (typeof val === "function") {
                if (isChild(val, ComponentCtor)) {
                    const fullName = `cc.${key}`;
                    compMap.set(fullName, {
                        name: fullName,
                        ctorName: key,
                        category: "component",
                        isBuiltin: true,
                        cid: "",
                        tsType: `import("cc").${key}`,
                    });
                } else if (isChild(val, AssetCtor)) {
                    const fullName = `cc.${key}`;
                    assetMap.set(fullName, {
                        name: fullName,
                        ctorName: key,
                        category: "asset",
                        isBuiltin: true,
                        cid: "",
                        tsType: `import("cc").${key}`,
                    });
                }

                // Tier 2B: Static sub-enums on cc classes (e.g. cc.Sprite.Type, cc.Layout.Type)
                try {
                    const subKeys = Object.keys(val);
                    for (let s = 0; s < subKeys.length; s++) {
                        const sk = subKeys[s];
                        if (!sk || sk.startsWith("_") || sk[0] !== sk[0].toUpperCase()) continue;
                        const subVal = val[sk];
                        if (subVal && typeof subVal === "object" && isRegisteredEnum(subVal)) {
                            registerEnumObj(subVal, `${key}.${sk}`, true, `import("cc").${key}.${sk}`);
                        }
                    }
                } catch {}
            }
        }

        // ─── 2. Scan all registered @ccclass classes + Tier-3 @property({ type: Enum(...) }) metadata ───
        const registries = [
            cc.js._registeredClassNames,
            cc.js._nameToClass,
            cc.js._idToClass,
        ].filter(Boolean);

        const DELIM = cc.Class?.Attr?.DELIMETER || "$";
        const seenCtors = new Set<any>();

        for (const reg of registries) {
            const keys = Object.keys(reg);
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                const ctor = reg[k];
                if (typeof ctor !== "function" || seenCtors.has(ctor)) continue;
                seenCtors.add(ctor);

                const className: string =
                    (typeof cc.js.getClassName === "function" ? cc.js.getClassName(ctor) : "") ||
                    ctor.name ||
                    "";
                if (!className || className.startsWith("__")) continue;

                if (!className.startsWith("cc.")) {
                    const cid: string =
                        typeof cc.js._getClassId === "function" ? cc.js._getClassId(ctor, false) || "" : "";

                    if (isChild(ctor, ComponentCtor)) {
                        if (!compMap.has(className)) {
                            compMap.set(className, {
                                name: className,
                                ctorName: ctor.name || className,
                                category: "component",
                                isBuiltin: false,
                                cid,
                                tsType: `import("cc").Component`,
                            });
                        }
                    } else if (isChild(ctor, AssetCtor)) {
                        if (!assetMap.has(className)) {
                            assetMap.set(className, {
                                name: className,
                                ctorName: ctor.name || className,
                                category: "asset",
                                isBuiltin: false,
                                cid,
                                tsType: `import("cc").Asset`,
                            });
                        }
                    }
                }

                // Tier 3: Inspect CCClass.Attr for any property with type === "Enum" & enumList
                try {
                    const attrs = cc.Class?.Attr?.getClassAttrs?.(ctor);
                    if (attrs && typeof attrs === "object") {
                        for (const attrKey of Object.keys(attrs)) {
                            if (!attrKey.endsWith(`${DELIM}enumList`)) continue;
                            const enumList = attrs[attrKey];
                            if (!Array.isArray(enumList) || enumList.length === 0) continue;
                            const propName = attrKey.slice(0, attrKey.length - `${DELIM}enumList`.length);
                            // Check if this enumList matches an already-known enum object
                            let matched = false;
                            for (const [, existingItem] of enumMap) {
                                if (
                                    existingItem.members.length === enumList.length &&
                                    existingItem.members.every(
                                        (m, idx) => m.name === String(enumList[idx]?.name) && m.value === enumList[idx]?.value
                                    )
                                ) {
                                    matched = true;
                                    break;
                                }
                            }
                            if (!matched) {
                                const fallbackName = `${className}.${propName}`;
                                if (!enumMap.has(fallbackName)) {
                                    enumMap.set(fallbackName, {
                                        name: fallbackName,
                                        isBuiltin: className.startsWith("cc."),
                                        tsType: "number",
                                        members: enumList.map((e: any) => ({ name: String(e.name), value: e.value })),
                                    });
                                }
                            }
                        }
                    }
                } catch {}
            }
        }

        // ─── 3. Tier 4: Inspect live in-memory project module exports via Editor.Module.importProjectModule ───
        const getPtsEnumRegistry = (): any => {
            const g: any = globalThis as any;
            const w: any = typeof window !== "undefined" ? (window as any) : null;
            const reg = g?.pTS?.__enums__ || w?.pTS?.__enums__;
            return reg && typeof reg.forEach === "function" ? reg : null;
        };

        const unnamedOriginScript = new Map<any, string>();
        if (Array.isArray(scriptUrls) && typeof Editor !== "undefined" && Editor?.Module?.importProjectModule) {
            for (let i = 0; i < scriptUrls.length; i++) {
                const dbUrl = scriptUrls[i];
                if (!dbUrl || typeof dbUrl !== "string") continue;
                try {
                    const regBefore = getPtsEnumRegistry();
                    const prevKeys = new Set<any>();
                    if (regBefore) {
                        regBefore.forEach((_: any, k: any) => prevKeys.add(k));
                    }

                    const mod = await Editor.Module.importProjectModule(dbUrl);
                    const modImportPath = dbUrl.replace(/\.ts$/, "");
                    const fileBase = modImportPath.split("/").pop() || "CustomEnum";

                    if (mod && typeof mod === "object") {
                        for (const expKey of Object.keys(mod)) {
                            if (!expKey || expKey === "default" || expKey.startsWith("_")) continue;
                            const expVal = mod[expKey];
                            if (expVal && typeof expVal === "object" && isRegisteredEnum(expVal)) {
                                registerEnumObj(
                                    expVal,
                                    expKey,
                                    false,
                                    `import(${JSON.stringify(modImportPath)}).${expKey}`,
                                );
                            }
                        }
                    }

                    // Tag any newly hooked unexported enum with its source script basename
                    const regAfter = getPtsEnumRegistry();
                    if (regAfter) {
                        regAfter.forEach((_: any, k: any) => {
                            if (!prevKeys.has(k) && !seenEnumObjs.has(k) && !unnamedOriginScript.has(k)) {
                                unnamedOriginScript.set(k, fileBase);
                            }
                        });
                    }
                } catch {}
            }
        }

        // ─── 4. pLazy.enums hooker registry (`globalThis.pTS.__enums__`) ───
        // Picks up every enum wrapped via `pLazy.enums(...)`, `pLazy.enums.create(...)`, or `pLazy.enums.register(...)`
        let anonIdx = 1;
        const ptsEnumRegistry = getPtsEnumRegistry();
        if (ptsEnumRegistry) {
            ptsEnumRegistry.forEach((entry: any, enumObj: any) => {
                if (!enumObj || typeof enumObj !== "object") return;
                const entryName = typeof entry?.name === "string" && entry.name.trim() ? entry.name.trim() : "";
                const entryTsType = typeof entry?.tsType === "string" && entry.tsType.trim() ? entry.tsType.trim() : "";

                if (seenEnumObjs.has(enumObj)) {
                    // Upgrade existing entry if pLazy.enums provided an explicit tsType
                    const existingKey = seenEnumObjs.get(enumObj)!;
                    const existing = enumMap.get(existingKey);
                    if (existing && existing.tsType === "number" && entryTsType) {
                        existing.tsType = entryTsType;
                    }
                    return;
                }

                const originHint = unnamedOriginScript.get(enumObj);
                const resolvedName = entryName || (originHint ? `${originHint}_Enum` : `CustomEnum_${anonIdx++}`);
                const resolvedTsType = entryTsType || "number";
                registerEnumObj(enumObj, resolvedName, false, resolvedTsType);
            });
        }

        // ─── 5. Any remaining cc.Enum hooked enums not yet named ───
        _hookedEnums.forEach((enumObj) => {
            if (!seenEnumObjs.has(enumObj)) {
                registerEnumObj(enumObj, `CustomEnum_${anonIdx++}`, false, "number");
            }
        });

        const sortItems = <T extends { isBuiltin: boolean; name: string }>(a: T, b: T) => {
            if (a.isBuiltin !== b.isBuiltin) return a.isBuiltin ? -1 : 1;
            return a.name.localeCompare(b.name);
        };

        return {
            components: Array.from(compMap.values()).sort(sortItems),
            assets: Array.from(assetMap.values()).sort(sortItems),
            enums: Array.from(enumMap.values()).sort(sortItems),
        };
    },
};
