import {
    buildDtoClassName,
    COMPLEX_MODES,
    IComponentDef,
    IEcsSchemaProfile,
    IValidationResult,
    normalizeEcsSettings,
    PRIMITIVE_TYPES,
} from "./schema";

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const RESERVED_WORDS = new Set([
    "break", "case", "catch", "class", "const", "continue", "debugger", "default",
    "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for",
    "function", "if", "import", "in", "instanceof", "let", "new", "null", "return",
    "super", "switch", "this", "throw", "true", "try", "typeof", "var", "void",
    "while", "with", "yield", "implements", "interface", "package", "private",
    "protected", "public", "static", "any", "number", "string", "boolean", "symbol",
    "object", "unknown", "never", "undefined",
]);

const PRIMITIVE_SET = new Set<string>(PRIMITIVE_TYPES);
const COMPLEX_SET = new Set<string>(COMPLEX_MODES);

export function isValidIdentifier(name: string): boolean {
    if (!name || !IDENT_RE.test(name)) return false;
    return !RESERVED_WORDS.has(name);
}

/**
 * Detect circular direct (`complex === "single"`) nesting or `extends` inheritance between ECS components.
 * Returns cycle chain (e.g. ["A", "B", "A"]) or null if acyclic.
 */
export function findComponentCycle(components: IComponentDef[]): string[] | null {
    const graph = new Map<string, string[]>();
    for (const c of components) {
        const deps: string[] = [];
        for (const ext of c.extends || []) {
            const ename = (ext || "").trim();
            if (ename) deps.push(ename);
        }
        for (const p of c.props) {
            if (p.kind === "component" && p.complex === "single") {
                deps.push(p.type);
            }
        }
        graph.set(c.name, deps);
    }

    const state = new Map<string, number>(); // 0=unvisited, 1=visiting, 2=done
    const stack: string[] = [];

    function dfs(node: string): string[] | null {
        state.set(node, 1);
        stack.push(node);
        const deps = graph.get(node) || [];
        for (const next of deps) {
            if (!graph.has(next)) continue;
            const st = state.get(next) || 0;
            if (st === 1) {
                const idx = stack.indexOf(next);
                return [...stack.slice(idx), next];
            }
            if (st === 0) {
                const found = dfs(next);
                if (found) return found;
            }
        }
        stack.pop();
        state.set(node, 2);
        return null;
    }

    for (const c of components) {
        if ((state.get(c.name) || 0) === 0) {
            const cycle = dfs(c.name);
            if (cycle) return cycle;
        }
    }
    return null;
}

export function validateSchema(schema: IEcsSchemaProfile): IValidationResult {
    const errors: string[] = [];
    const compNames = new Set<string>();
    const structNames = new Set<string>();

    // 1. Validate Components
    for (let i = 0; i < schema.components.length; i++) {
        const comp = schema.components[i];
        const cname = (comp.name || "").trim();
        if (!isValidIdentifier(cname)) {
            errors.push(`Component #${i + 1}: invalid identifier "${comp.name}".`);
        } else if (compNames.has(cname)) {
            errors.push(`Duplicate component name "${cname}".`);
        } else {
            compNames.add(cname);
            if (comp.is_component === false) {
                structNames.add(cname);
            }
        }
    }

    for (const comp of schema.components) {
        // Validate `extends` (parent pTS-ECS components)
        if (Array.isArray(comp.extends) && comp.extends.length > 0) {
            const seenExt = new Set<string>();
            for (const rawExt of comp.extends) {
                const ename = String(rawExt ?? "").trim();
                if (!ename) {
                    errors.push(`Component "${comp.name}": extends entry cannot be empty.`);
                } else if (ename === comp.name) {
                    errors.push(`Component "${comp.name}": cannot extend itself.`);
                } else if (!compNames.has(ename)) {
                    errors.push(`Component "${comp.name}": extended component "${ename}" does not exist.`);
                } else if (seenExt.has(ename)) {
                    errors.push(`Component "${comp.name}": duplicate extends entry "${ename}".`);
                } else {
                    seenExt.add(ename);
                }
            }
        }

        const propNames = new Set<string>();
        for (let j = 0; j < comp.props.length; j++) {
            const prop = comp.props[j];
            const pname = (prop.name || "").trim();
            if (!isValidIdentifier(pname)) {
                errors.push(`Component "${comp.name}" prop #${j + 1}: invalid identifier "${prop.name}".`);
            } else if (propNames.has(pname)) {
                errors.push(`Component "${comp.name}": duplicate prop "${pname}".`);
            } else {
                propNames.add(pname);
            }

            if (!COMPLEX_SET.has(prop.complex)) {
                errors.push(`Component "${comp.name}.${pname}": invalid complex mode "${prop.complex}".`);
            }

            if (prop.kind === "primitive") {
                if (!PRIMITIVE_SET.has(prop.type)) {
                    errors.push(`Component "${comp.name}.${pname}": unknown primitive "${prop.type}".`);
                }
            } else if (prop.kind === "cocos") {
                if (!(prop.type || "").trim()) {
                    errors.push(`Component "${comp.name}.${pname}": Cocos/Asset/Component type cannot be empty.`);
                }
            } else if (prop.kind === "enum") {
                if (!(prop.type || "").trim()) {
                    errors.push(`Component "${comp.name}.${pname}": Enum type cannot be empty.`);
                }
            } else if (prop.kind === "component") {
                if (!compNames.has(prop.type)) {
                    errors.push(`Component "${comp.name}.${pname}": referenced component "${prop.type}" does not exist.`);
                }
            } else {
                errors.push(`Component "${comp.name}.${pname}": unknown type kind "${prop.kind}".`);
            }
        }
    }

    const cycle = findComponentCycle(schema.components);
    if (cycle) {
        errors.push(`Circular nested component reference detected: ${cycle.join(" -> ")}.`);
    }

    // 2. Validate Worlds
    const worldNames = new Set<string>();
    for (let i = 0; i < schema.worlds.length; i++) {
        const w = schema.worlds[i];
        const wname = (w.name || "").trim();
        if (!wname) {
            errors.push(`World #${i + 1}: world name cannot be empty.`);
        } else if (worldNames.has(wname)) {
            errors.push(`Duplicate world name "${wname}".`);
        } else {
            worldNames.add(wname);
        }

        if (w.max_entities !== "Infinity") {
            const num = Number(w.max_entities);
            if (!Number.isFinite(num) || num < 1) {
                errors.push(`World "${wname}": max_entities must be "Infinity" or a positive integer >= 1.`);
            }
        }

        for (const cname of w.components || []) {
            if (!compNames.has(cname)) {
                errors.push(`World "${wname}": references missing component "${cname}".`);
            } else if (structNames.has(cname)) {
                errors.push(`World "${wname}": "${cname}" is marked as a non-component struct and cannot be registered in a world.`);
            }
        }

        const mode = w.event_mode ?? "primitive";
        if (mode !== "primitive" && mode !== "manual") {
            errors.push(`World "${wname}": invalid event_mode "${String(mode)}".`);
        } else if (mode === "manual") {
            const evs = Array.isArray(w.events) ? w.events : [];
            if (evs.length === 0) {
                errors.push(`World "${wname}": manual event mode requires at least 1 event name.`);
            } else {
                const seenEv = new Set<string>();
                for (let eIdx = 0; eIdx < evs.length; eIdx++) {
                    const ev = String(evs[eIdx] ?? "").trim();
                    if (!ev) {
                        errors.push(`World "${wname}": event #${eIdx + 1} cannot be empty.`);
                    } else if (seenEv.has(ev)) {
                        errors.push(`World "${wname}": duplicate event "${ev}".`);
                    } else {
                        seenEv.add(ev);
                    }
                }
            }
        }
    }

    // 3. Validate Settings (DTO class naming when enabled)
    const settings = normalizeEcsSettings(schema.settings);
    if (settings.auto_generate_dto) {
        const baseDtoName = buildDtoClassName("Base", settings);
        if (!isValidIdentifier(baseDtoName)) {
            errors.push(`Settings: generated base DTO @ccclass name "${baseDtoName}" is not a valid identifier (check prefix/suffix).`);
        }
        const seenDtoNames = new Set<string>([baseDtoName]);
        for (const comp of schema.components) {
            const cname = (comp.name || "").trim();
            if (!cname) continue;
            const dtoName = buildDtoClassName(cname, settings);
            if (!isValidIdentifier(dtoName)) {
                errors.push(`Settings: generated DTO @ccclass name "${dtoName}" for "${cname}" is not a valid identifier.`);
            } else if (seenDtoNames.has(dtoName)) {
                errors.push(`Settings: duplicate generated DTO @ccclass name "${dtoName}".`);
            } else {
                seenDtoNames.add(dtoName);
            }
        }
    }

    return { ok: errors.length === 0, errors };
}
