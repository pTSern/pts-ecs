import pkg from "../package.json";
import {
    COMPLEX_MODES,
    DEFAULT_COCOS_ASSETS,
    DEFAULT_COCOS_COMPONENTS,
    DEFAULT_COCOS_ENUMS,
    IComponentDef,
    IEcsSchemaProfile,
    IEngineEnumOption,
    IEngineTypeOption,
    IEngineTypesPayload,
    IPropDef,
    IWorldDef,
    PRIMITIVE_TYPES,
    TPropComplex,
    TPropTypeKind,
} from "./schema";
import { generateComponentsDts, generateWorldsDts } from "./codegen";

const PKG_NAME = pkg.name;

function escHtml(str: string): string {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function cloneSchema(s: IEcsSchemaProfile): IEcsSchemaProfile {
    return JSON.parse(JSON.stringify(s));
}

export const style = `
:host {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    color: var(--color-normal-text, #d4d4d4);
    background: var(--color-normal-fill, #252526);
    user-select: none;
    overflow: hidden;
}
* { box-sizing: border-box; }

.topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--color-normal-fill-emphasis, #1e1e1e);
    border-bottom: 1px solid var(--color-normal-border, #3c3c3c);
    gap: 10px;
}
.brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 13px;
}
.tabs {
    display: flex;
    gap: 4px;
    background: rgba(0, 0, 0, 0.25);
    padding: 3px;
    border-radius: 6px;
}
.tab-btn {
    border: none;
    background: transparent;
    color: #aaa;
    padding: 5px 14px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
}
.tab-btn.active {
    background: #2f6fed;
    color: #fff;
}
.tab-btn:hover:not(.active) {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
}
.top-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}
.badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    background: rgba(255, 255, 255, 0.1);
    color: #ccc;
}
.badge.green { background: rgba(46, 160, 67, 0.25); color: #7ee787; }
.badge.blue { background: rgba(47, 111, 237, 0.25); color: #79c0ff; }
.badge.amber { background: rgba(210, 153, 34, 0.25); color: #f0c674; }

.banner {
    padding: 7px 12px;
    font-size: 12px;
    display: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.banner.show { display: block; }
.banner.ok { background: rgba(46, 160, 67, 0.2); color: #7ee787; }
.banner.err { background: rgba(248, 81, 73, 0.22); color: #ff9492; white-space: pre-wrap; }

.workspace {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
}
.subpanel {
    display: none;
    flex: 1;
    min-height: 0;
    overflow: hidden;
}
.subpanel.active {
    display: flex;
}

.sidebar {
    width: clamp(150px, 24%, 230px);
    min-width: 140px;
    flex-shrink: 0;
    border-right: 1px solid var(--color-normal-border, #3c3c3c);
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.12);
}
.sidebar-head {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-bottom: 1px solid var(--color-normal-border, #3c3c3c);
}
.list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.list-item {
    padding: 8px 10px;
    border-radius: 5px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.list-item:hover { background: rgba(255, 255, 255, 0.07); }
.list-item.selected {
    border-color: #2f6fed;
    background: rgba(47, 111, 237, 0.15);
}
.list-item-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
}
.item-title { font-weight: 600; font-size: 12px; color: #f0f0f0; }
.item-meta { font-size: 11px; color: #9aa0a6; display: flex; flex-wrap: wrap; gap: 4px; }
.item-btns { display: flex; gap: 4px; }

.editor-pane {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    container-type: inline-size;
    container-name: editor;
}
.empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #888;
    gap: 10px;
}

.field-row {
    display: flex;
    align-items: center;
    gap: 10px;
}
.field-label {
    width: 120px;
    font-weight: 500;
    color: #bbb;
    flex-shrink: 0;
}

input[type="text"], input[type="number"], select {
    background: #1b1b1c;
    color: #e6e6e6;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 5px 8px;
    font-size: 12px;
    outline: none;
}
input:focus, select:focus {
    border-color: #2f6fed;
}
input:disabled, select:disabled {
    opacity: 0.45;
}
.grow { flex: 1; min-width: 0; }

.btn {
    border: 1px solid #4a4a4a;
    background: #333;
    color: #e6e6e6;
    padding: 5px 11px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
}
.btn:hover { background: #3f3f3f; }
.btn.primary { background: #2f6fed; border-color: #2f6fed; color: #fff; font-weight: 500; }
.btn.primary:hover { background: #255fd4; }
.btn.success { background: #238636; border-color: #238636; color: #fff; font-weight: 500; }
.btn.success:hover { background: #2ea043; }
.btn.danger { background: rgba(218, 54, 51, 0.2); border-color: rgba(218, 54, 51, 0.5); color: #ff9492; }
.btn.danger:hover { background: rgba(218, 54, 51, 0.35); }
.btn.sm { padding: 2px 7px; font-size: 11px; }

.section-card {
    border: 1px solid var(--color-normal-border, #3c3c3c);
    border-radius: 6px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.02);
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.section-title { font-weight: 600; color: #ddd; font-size: 12px; }

.prop-table {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
}
.prop-header, .prop-row {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1.35fr) minmax(0, 0.95fr) minmax(0, 0.7fr) 68px;
    gap: 5px;
    align-items: center;
    min-width: 0;
}
.prop-row > input,
.prop-row > select {
    min-width: 0;
    width: 100%;
    text-overflow: ellipsis;
}
.prop-row .item-btns {
    justify-content: flex-end;
    flex-shrink: 0;
}
.prop-row .item-btns .btn.sm {
    padding: 2px 5px;
    min-width: 20px;
}
.prop-header {
    font-size: 11px;
    color: #888;
    padding: 0 2px;
}

@container editor (max-width: 520px) {
    .prop-header {
        display: none;
    }
    .prop-row {
        grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 0.75fr);
        grid-template-areas:
            "name name actions"
            "type complex def";
        padding: 6px;
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 5px;
        background: rgba(0, 0, 0, 0.16);
    }
    .prop-row > [data-field="name"] { grid-area: name; }
    .prop-row > [data-field="type"] { grid-area: type; }
    .prop-row > [data-field="complex"] { grid-area: complex; }
    .prop-row > [data-field="defaultValue"] { grid-area: def; }
    .prop-row > .item-btns { grid-area: actions; }
    .field-label { width: 92px; }
}

.comp-checklist {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 6px;
    max-height: 220px;
    overflow-y: auto;
    padding: 4px;
}
.comp-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 4px;
    border: 1px solid #3c3c3c;
    background: #1e1e1e;
    cursor: pointer;
}
.comp-chip.checked {
    border-color: #2f6fed;
    background: rgba(47, 111, 237, 0.18);
}
.extends-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    align-items: center;
}
.extends-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 11px;
    background: rgba(155, 107, 204, 0.18);
    border: 1px solid rgba(155, 107, 204, 0.5);
    color: #d7b8ff;
}
.extends-pill button {
    border: none;
    background: transparent;
    color: #d7b8ff;
    cursor: pointer;
    padding: 0 2px;
    font-size: 12px;
    line-height: 1;
}
.extends-pill button:hover {
    color: #ff9492;
}
.world-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 11px;
    background: rgba(47, 111, 237, 0.18);
    border: 1px solid rgba(47, 111, 237, 0.5);
    color: #8ab4f8;
}
.world-pill button {
    border: none;
    background: transparent;
    color: #8ab4f8;
    cursor: pointer;
    padding: 0 2px;
    font-size: 12px;
    line-height: 1;
}
.world-pill button:hover {
    color: #ff9492;
}
.badge.purple {
    background: rgba(155, 107, 204, 0.18);
    color: #d7b8ff;
}
.inline-err {
    display: none;
    color: #ff9492;
    font-size: 11px;
    padding-left: 118px;
}
.inline-err.show {
    display: block;
}
input.input-err {
    border-color: #f85149 !important;
}

.code-preview {
    background: #161618;
    border: 1px solid #333;
    border-radius: 5px;
    padding: 8px 10px;
    font-family: Consolas, "Courier New", monospace;
    font-size: 11px;
    color: #9cdcfe;
    white-space: pre;
    overflow-x: auto;
    max-height: 170px;
    margin: 0;
}

.footer-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 6px;
    border-top: 1px solid var(--color-normal-border, #3c3c3c);
}

label.check-inline {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    color: #ddd;
}

.type-picker-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    width: 100%;
    min-width: 0;
    background: #1b1b1c;
    color: #e6e6e6;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 5px 8px;
    font-size: 12px;
    cursor: pointer;
    text-align: left;
}
.type-picker-btn:hover,
.type-picker-btn.open {
    border-color: #2f6fed;
    background: #222225;
}
.type-picker-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
}
.type-picker-caret {
    color: #888;
    font-size: 10px;
    flex-shrink: 0;
}

.type-flyout-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9998;
    display: none;
}
.type-flyout-backdrop.show {
    display: block;
}
.type-flyout-root {
    position: fixed;
    z-index: 9999;
    display: none;
    align-items: flex-start;
    gap: 4px;
}
.type-flyout-root.show {
    display: flex;
}
.type-cat-menu {
    width: 196px;
    background: #1f1f23;
    border: 1px solid #45454a;
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.type-cat-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 9px;
    border-radius: 4px;
    cursor: pointer;
    color: #e0e0e0;
    font-size: 12px;
}
.type-cat-item:hover,
.type-cat-item.active {
    background: #2f6fed;
    color: #fff;
}
.type-cat-item .cat-right {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    opacity: 0.85;
}
.type-sub-menu {
    width: 240px;
    max-height: 290px;
    background: #1f1f23;
    border: 1px solid #45454a;
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
    display: none;
    flex-direction: column;
    overflow: hidden;
}
.type-sub-menu.show {
    display: flex;
}
.type-sub-search {
    padding: 6px;
    border-bottom: 1px solid #333;
}
.type-sub-search input {
    width: 100%;
    padding: 4px 7px;
    font-size: 11px;
}
.type-sub-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.type-sub-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 4px;
    cursor: pointer;
    color: #dcdcdc;
    font-size: 12px;
}
.type-sub-item:hover {
    background: rgba(47, 111, 237, 0.28);
    color: #fff;
}
.type-sub-item.selected {
    background: #2f6fed;
    color: #fff;
}
.type-sub-empty {
    padding: 10px;
    text-align: center;
    color: #777;
    font-size: 11px;
}
`;

export const template = `
<div class="topbar">
    <div class="brand">
        <span>pTS-ECS</span>
        <span class="badge" id="summary-badge">0 components · 0 worlds</span>
    </div>
    <div class="tabs">
        <button class="tab-btn active" data-tab="components">Components</button>
        <button class="tab-btn" data-tab="worlds">Worlds</button>
    </div>
    <div class="top-actions">
        <button class="btn sm" id="btn-refresh-schema" title="Reload latest Components & Worlds from profile">↻ Refresh Panel</button>
        <button class="btn sm" id="btn-refresh-types" title="Rescan all cc.Component, cc.Asset & Enum types">↻ Refresh Types</button>
        <button class="btn sm" id="btn-regen">Regenerate All</button>
    </div>
</div>

<div class="banner" id="status-banner"></div>

<div class="workspace">
    <!-- Sub-panel 1: Components -->
    <div class="subpanel active" id="panel-components">
        <div class="sidebar">
            <div class="sidebar-head">
                <button class="btn primary" id="btn-new-comp">+ Create New Component</button>
                <input type="text" id="filter-comp" placeholder="Search components..." />
            </div>
            <div class="list" id="comp-list"></div>
        </div>
        <div class="editor-pane" id="comp-editor"></div>
    </div>

    <!-- Sub-panel 2: Worlds -->
    <div class="subpanel" id="panel-worlds">
        <div class="sidebar">
            <div class="sidebar-head">
                <button class="btn primary" id="btn-new-world">+ Create New World</button>
                <input type="text" id="filter-world" placeholder="Search worlds..." />
            </div>
            <div class="list" id="world-list"></div>
        </div>
        <div class="editor-pane" id="world-editor"></div>
    </div>
</div>

<!-- Floating Cascading Type Selector Menu -->
<div class="type-flyout-backdrop" id="type-flyout-backdrop"></div>
<div class="type-flyout-root" id="type-flyout-root">
    <div class="type-cat-menu" id="type-cat-menu"></div>
    <div class="type-sub-menu" id="type-sub-menu">
        <div class="type-sub-search" id="type-sub-search-wrap">
            <input type="text" id="type-sub-search-input" placeholder="Filter..." />
        </div>
        <div class="type-sub-list" id="type-sub-list"></div>
    </div>
</div>
`;

export const $ = {
    tabs: ".tabs",
    summaryBadge: "#summary-badge",
    statusBanner: "#status-banner",
    btnRefreshSchema: "#btn-refresh-schema",
    btnRefreshTypes: "#btn-refresh-types",
    btnRegen: "#btn-regen",
    panelComponents: "#panel-components",
    panelWorlds: "#panel-worlds",
    btnNewComp: "#btn-new-comp",
    filterComp: "#filter-comp",
    compList: "#comp-list",
    compEditor: "#comp-editor",
    btnNewWorld: "#btn-new-world",
    filterWorld: "#filter-world",
    worldList: "#world-list",
    worldEditor: "#world-editor",
    typeFlyoutBackdrop: "#type-flyout-backdrop",
    typeFlyoutRoot: "#type-flyout-root",
    typeCatMenu: "#type-cat-menu",
    typeSubMenu: "#type-sub-menu",
    typeSubSearchWrap: "#type-sub-search-wrap",
    typeSubSearchInput: "#type-sub-search-input",
    typeSubList: "#type-sub-list",
};

interface IPanelState {
    tab: "components" | "worlds";
    schema: IEcsSchemaProfile;
    engineTypes: IEngineTypesPayload;
    engineTypeLookup: Map<string, IEngineTypeOption>;
    engineEnumLookup: Map<string, IEngineEnumOption>;
    editingCompIndex: number | null; // null=none, -1=new, >=0=existing index
    draftComp: IComponentDef | null;
    draftCompWorlds: string[];
    editingWorldIndex: number | null;
    draftWorld: IWorldDef | null;
}

function defaultEngineTypes(): IEngineTypesPayload {
    return {
        nodes: [{ name: "cc.Node", ctorName: "Node", category: "node", isBuiltin: true, tsType: 'import("cc").Node' }],
        components: DEFAULT_COCOS_COMPONENTS.map((n) => ({
            name: n,
            ctorName: n.slice(3),
            category: "component",
            isBuiltin: true,
            tsType: `import("cc").${n.slice(3)}`,
        })),
        assets: DEFAULT_COCOS_ASSETS.map((n) => ({
            name: n,
            ctorName: n.slice(3),
            category: "asset",
            isBuiltin: true,
            tsType: `import("cc").${n.slice(3)}`,
        })),
        enums: DEFAULT_COCOS_ENUMS.map((e) => ({ ...e, members: [...e.members] })),
    };
}

export const ready = async function (this: any) {
    const state: IPanelState = {
        tab: "components",
        schema: { components: [], worlds: [] },
        engineTypes: defaultEngineTypes(),
        engineTypeLookup: new Map(),
        engineEnumLookup: new Map(),
        editingCompIndex: null,
        draftComp: null,
        draftCompWorlds: [],
        editingWorldIndex: null,
        draftWorld: null,
    };

    const rebuildEngineLookup = () => {
        state.engineTypeLookup.clear();
        state.engineEnumLookup.clear();
        for (const item of [
            ...state.engineTypes.nodes,
            ...state.engineTypes.components,
            ...state.engineTypes.assets,
        ]) {
            state.engineTypeLookup.set(item.name, item);
        }
        for (const en of state.engineTypes.enums || []) {
            state.engineEnumLookup.set(en.name, en);
        }
    };
    rebuildEngineLookup();

    const loadEngineTypes = async (announce = false) => {
        try {
            const payload = (await Editor.Message.request(PKG_NAME, "list-engine-types")) as IEngineTypesPayload;
            if (payload && Array.isArray(payload.components) && Array.isArray(payload.assets)) {
                state.engineTypes = {
                    nodes: Array.isArray(payload.nodes) ? payload.nodes : defaultEngineTypes().nodes,
                    components: payload.components,
                    assets: payload.assets,
                    enums: Array.isArray(payload.enums) ? payload.enums : defaultEngineTypes().enums,
                };
                rebuildEngineLookup();
                if (announce) {
                    showBanner(
                        `Discovered ${state.engineTypes.components.length} Component(s), ${state.engineTypes.assets.length} Asset(s), & ${state.engineTypes.enums.length} Enum(s).`,
                        false
                    );
                }
                if (state.tab === "components" && state.draftComp) {
                    renderCompEditor();
                }
            }
        } catch {}
    };

    const showBanner = (msg: string, isErr: boolean = false) => {
        const el = this.$.statusBanner as HTMLElement;
        el.textContent = msg;
        el.className = `banner show ${isErr ? "err" : "ok"}`;
    };

    const clearBanner = () => {
        const el = this.$.statusBanner as HTMLElement;
        el.className = "banner";
    };

    const updateSummary = () => {
        this.$.summaryBadge.textContent =
            `${state.schema.components.length} components · ${state.schema.worlds.length} worlds`;
    };

    const applyExternalSchema = (nextSchema: IEcsSchemaProfile, announceMsg?: string) => {
        const prevCompName =
            state.editingCompIndex !== null && state.editingCompIndex >= 0
                ? state.schema.components[state.editingCompIndex]?.name || null
                : null;
        const prevWorldName =
            state.editingWorldIndex !== null && state.editingWorldIndex >= 0
                ? state.schema.worlds[state.editingWorldIndex]?.name || null
                : null;

        state.schema = {
            components: Array.isArray(nextSchema?.components) ? nextSchema.components : [],
            worlds: Array.isArray(nextSchema?.worlds) ? nextSchema.worlds : [],
        };

        // Reconcile existing component selection without clobbering an unsaved "new component" draft
        if (state.editingCompIndex !== null && state.editingCompIndex >= 0) {
            const newIdx = prevCompName
                ? state.schema.components.findIndex((c) => c.name === prevCompName)
                : -1;
            if (newIdx >= 0) {
                state.editingCompIndex = newIdx;
                state.draftComp = JSON.parse(JSON.stringify(state.schema.components[newIdx]));
                if (state.draftComp!.is_component === undefined) state.draftComp!.is_component = true;
                if (!Array.isArray(state.draftComp!.extends)) state.draftComp!.extends = [];
                state.draftCompWorlds = state.schema.worlds
                    .filter((w) => w.components.includes(prevCompName!))
                    .map((w) => w.name);
            } else {
                state.editingCompIndex = null;
                state.draftComp = null;
                state.draftCompWorlds = [];
            }
        }

        // Reconcile existing world selection without clobbering an unsaved "new world" draft
        if (state.editingWorldIndex !== null && state.editingWorldIndex >= 0) {
            const newWIdx = prevWorldName
                ? state.schema.worlds.findIndex((w) => w.name === prevWorldName)
                : -1;
            if (newWIdx >= 0) {
                state.editingWorldIndex = newWIdx;
                state.draftWorld = JSON.parse(JSON.stringify(state.schema.worlds[newWIdx]));
            } else {
                state.editingWorldIndex = null;
                state.draftWorld = null;
            }
        }

        updateSummary();
        renderCompList();
        renderCompEditor();
        renderWorldList();
        renderWorldEditor();

        if (announceMsg) {
            showBanner(announceMsg, false);
        }
    };

    const loadSchema = async (announce = false) => {
        try {
            const loaded = (await Editor.Message.request(PKG_NAME, "get-schema")) as IEcsSchemaProfile;
            applyExternalSchema(
                loaded || { components: [], worlds: [] },
                announce
                    ? `Refreshed panel: ${(loaded?.components || []).length} component(s) & ${(loaded?.worlds || []).length} world(s).`
                    : undefined
            );
        } catch {
            applyExternalSchema({ components: [], worlds: [] });
        }
    };

    let isSelfSaving = false;

    (this as any)._onRequestUpdatePanel = async (incoming?: IEcsSchemaProfile) => {
        if (isSelfSaving) return;
        if (incoming && Array.isArray(incoming.components) && Array.isArray(incoming.worlds)) {
            applyExternalSchema(incoming);
        } else {
            await loadSchema(false);
        }
    };

    const persistSchema = async (next: IEcsSchemaProfile, okMsg: string): Promise<boolean> => {
        isSelfSaving = true;
        let res: { ok: boolean; errors?: string[] } | null = null;
        try {
            res = (await Editor.Message.request(PKG_NAME, "save-schema", next)) as {
                ok: boolean;
                errors?: string[];
            };
        } finally {
            isSelfSaving = false;
        }
        if (!res || !res.ok) {
            showBanner((res?.errors || ["Save failed"]).join("\n"), true);
            return false;
        }
        state.schema = cloneSchema(next);
        updateSummary();
        showBanner(okMsg, false);
        return true;
    };

    // ─── Tab Switching ───
    const tabsEl = this.$.tabs as HTMLElement;
    const tabBtns = tabsEl ? Array.from(tabsEl.querySelectorAll<HTMLButtonElement>(".tab-btn")) : [];
    tabBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.tab as "components" | "worlds";
            state.tab = target;
            tabBtns.forEach((b) => b.classList.toggle("active", b === btn));
            this.$.panelComponents.classList.toggle("active", target === "components");
            this.$.panelWorlds.classList.toggle("active", target === "worlds");
            if (target === "worlds") {
                renderWorldList();
                renderWorldEditor();
            } else {
                renderCompList();
                renderCompEditor();
            }
        });
    });

    this.$.btnRefreshSchema.addEventListener("click", async () => {
        await loadSchema(true);
    });

    this.$.btnRefreshTypes.addEventListener("click", async () => {
        await loadEngineTypes(true);
    });

    this.$.btnRegen.addEventListener("click", async () => {
        const res = (await Editor.Message.request(PKG_NAME, "regenerate")) as { ok: boolean; errors?: string[] };
        if (res?.ok) {
            showBanner("Regenerated _$secret/ecs.components.(js|d.ts) & ecs.worlds.(js|d.ts).", false);
        } else {
            showBanner((res?.errors || ["Regenerate failed"]).join("\n"), true);
        }
    });

    // ─── Components Sub-Panel ───
    const renderCompList = () => {
        const q = String(this.$.filterComp.value || "").trim().toLowerCase();
        const container = this.$.compList as HTMLElement;
        container.innerHTML = "";

        const items = state.schema.components
            .map((c, idx) => ({ c, idx }))
            .filter(({ c }) => !q || c.name.toLowerCase().includes(q));

        if (items.length === 0) {
            container.innerHTML = `<div style="color:#777;padding:12px;text-align:center;">No components yet.</div>`;
            return;
        }

        for (const { c, idx } of items) {
            const usedByWorlds = state.schema.worlds.filter((w) => w.components.includes(c.name)).length;
            const extList = Array.isArray(c.extends) ? c.extends.filter(Boolean) : [];
            const isComp = c.is_component !== false;
            const div = document.createElement("div");
            div.className = `list-item${state.editingCompIndex === idx ? " selected" : ""}`;
            div.innerHTML = `
                <div class="list-item-top">
                    <span class="item-title">${escHtml(c.name)}</span>
                    <div class="item-btns">
                        <button class="btn sm danger" data-del="${idx}" title="Delete">×</button>
                    </div>
                </div>
                <div class="item-meta">
                    ${!isComp ? `<span class="badge amber" title="Base struct only — cannot be added to Worlds">Struct</span>` : ""}
                    <span class="badge">${c.props.length} props</span>
                    ${extList.length > 0 ? `<span class="badge purple" title="Extends ${escHtml(extList.join(", "))}">↳ ${escHtml(extList.join(", "))}</span>` : ""}
                    ${usedByWorlds > 0 ? `<span class="badge blue">${usedByWorlds} world(s)</span>` : ""}
                </div>
            `;
            div.addEventListener("click", (ev) => {
                const target = ev.target as HTMLElement;
                if (target.dataset.del !== undefined) return;
                clearBanner();
                state.editingCompIndex = idx;
                state.draftComp = JSON.parse(JSON.stringify(state.schema.components[idx]));
                if (state.draftComp!.is_component === undefined) state.draftComp!.is_component = true;
                if (!Array.isArray(state.draftComp!.extends)) state.draftComp!.extends = [];
                state.draftCompWorlds = state.schema.worlds
                    .filter((w) => w.components.includes(c.name))
                    .map((w) => w.name);
                renderCompList();
                renderCompEditor();
            });
            div.querySelector<HTMLButtonElement>("[data-del]")?.addEventListener("click", async (ev) => {
                ev.stopPropagation();
                const refByComps = state.schema.components
                    .filter((other) =>
                        other.name !== c.name && (
                            other.props.some((p) => p.kind === "component" && p.type === c.name) ||
                            (Array.isArray(other.extends) && other.extends.includes(c.name))
                        )
                    )
                    .map((other) => other.name);
                const refByWorlds = state.schema.worlds
                    .filter((w) => w.components.includes(c.name))
                    .map((w) => w.name);

                if (refByComps.length > 0 || refByWorlds.length > 0) {
                    showBanner(
                        `Cannot delete "${c.name}": still referenced by ` +
                        [
                            refByComps.length ? `components [${refByComps.join(", ")}]` : "",
                            refByWorlds.length ? `worlds [${refByWorlds.join(", ")}]` : "",
                        ].filter(Boolean).join(" & "),
                        true
                    );
                    return;
                }

                const next = cloneSchema(state.schema);
                next.components.splice(idx, 1);
                if (await persistSchema(next, `Deleted component "${c.name}" and regenerated _$secret files.`)) {
                    if (state.editingCompIndex === idx) {
                        state.editingCompIndex = null;
                        state.draftComp = null;
                    } else if (state.editingCompIndex !== null && state.editingCompIndex > idx) {
                        state.editingCompIndex--;
                    }
                    renderCompList();
                    renderCompEditor();
                }
            });
            container.appendChild(div);
        }
    };

    // ─── Cascading Hover Type Flyout Menu ───
    interface IFlyoutSubItem {
        label: string;
        badge?: string;
        kind: TPropTypeKind;
        type: string;
        tsType?: string;
        defaultVal?: string;
    }

    let activeFlyoutBtn: HTMLElement | null = null;
    let activeSubItems: IFlyoutSubItem[] = [];
    let activeOnPick: ((item: IFlyoutSubItem) => void) | null = null;
    let activeCurrentKey = "";

    const closeTypeFlyout = () => {
        (this.$.typeFlyoutBackdrop as HTMLElement).classList.remove("show");
        (this.$.typeFlyoutRoot as HTMLElement).classList.remove("show");
        (this.$.typeSubMenu as HTMLElement).classList.remove("show");
        if (activeFlyoutBtn) {
            activeFlyoutBtn.classList.remove("open");
            activeFlyoutBtn = null;
        }
        activeOnPick = null;
    };

    (this.$.typeFlyoutBackdrop as HTMLElement).addEventListener("click", closeTypeFlyout);

    const renderSubFlyoutList = (filterText: string) => {
        const subList = this.$.typeSubList as HTMLElement;
        subList.innerHTML = "";
        const q = filterText.trim().toLowerCase();
        const filtered = activeSubItems.filter((it) => !q || it.label.toLowerCase().includes(q));
        if (filtered.length === 0) {
            subList.innerHTML = `<div class="type-sub-empty">No matching types</div>`;
            return;
        }
        for (const item of filtered) {
            const key = `${item.kind}:${item.type}`;
            const div = document.createElement("div");
            div.className = `type-sub-item${key === activeCurrentKey ? " selected" : ""}`;
            div.innerHTML = `
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(item.label)}</span>
                ${item.badge ? `<span class="badge">${escHtml(item.badge)}</span>` : ""}
            `;
            div.addEventListener("click", (ev) => {
                ev.stopPropagation();
                if (activeOnPick) activeOnPick(item);
                closeTypeFlyout();
            });
            subList.appendChild(div);
        }
    };

    (this.$.typeSubSearchInput as HTMLInputElement).addEventListener("input", () => {
        renderSubFlyoutList((this.$.typeSubSearchInput as HTMLInputElement).value);
    });

    const clampFlyoutPosition = (anchorRect: DOMRect) => {
        const flyoutRoot = this.$.typeFlyoutRoot as HTMLElement;
        const vw = window.innerWidth || 800;
        const vh = window.innerHeight || 600;
        let left = anchorRect.left;
        let top = anchorRect.bottom + 4;
        const estWidth = 445;
        const estHeight = 290;
        if (left + estWidth > vw - 8) {
            left = Math.max(8, vw - estWidth - 8);
        }
        if (top + estHeight > vh - 8) {
            top = Math.max(8, anchorRect.top - Math.min(estHeight, anchorRect.top - 12));
        }
        flyoutRoot.style.left = `${Math.round(left)}px`;
        flyoutRoot.style.top = `${Math.round(top)}px`;
    };

    const openTypeFlyout = (
        btnEl: HTMLElement,
        prop: IPropDef,
        currentCompName: string,
        onPick: (picked: IFlyoutSubItem) => void,
    ) => {
        if (activeFlyoutBtn === btnEl) {
            closeTypeFlyout();
            return;
        }
        closeTypeFlyout();
        activeFlyoutBtn = btnEl;
        btnEl.classList.add("open");
        activeOnPick = onPick;
        activeCurrentKey = `${prop.kind}:${prop.type}`;

        const ecsComps = state.schema.components.filter((c) => c.name !== currentCompName);
        const categories: Array<{
            id: string;
            title: string;
            count?: number;
            directPick?: IFlyoutSubItem;
            items?: IFlyoutSubItem[];
        }> = [
            {
                id: "primitive",
                title: "Primitive",
                count: PRIMITIVE_TYPES.length,
                items: PRIMITIVE_TYPES.map((t) => ({
                    label: t,
                    kind: "primitive" as TPropTypeKind,
                    type: t,
                })),
            },
            {
                id: "node",
                title: "Cocos Node",
                directPick: {
                    label: "cc.Node",
                    kind: "cocos",
                    type: "cc.Node",
                    tsType: 'import("cc").Node',
                },
            },
            {
                id: "components",
                title: "Components",
                count: state.engineTypes.components.length,
                items: state.engineTypes.components.map((t) => ({
                    label: t.name,
                    badge: t.isBuiltin ? "cc" : "custom",
                    kind: "cocos" as TPropTypeKind,
                    type: t.name,
                    tsType: t.tsType,
                })),
            },
            {
                id: "assets",
                title: "Assets",
                count: state.engineTypes.assets.length,
                items: state.engineTypes.assets.map((t) => ({
                    label: t.name,
                    badge: t.isBuiltin ? "cc" : "custom",
                    kind: "cocos" as TPropTypeKind,
                    type: t.name,
                    tsType: t.tsType,
                })),
            },
            {
                id: "ecs_comp",
                title: "ECS Component",
                count: ecsComps.length,
                items: ecsComps.map((c) => ({
                    label: c.name,
                    badge: `${c.props.length}p`,
                    kind: "component" as TPropTypeKind,
                    type: c.name,
                })),
            },
            {
                id: "enum",
                title: "Enum",
                count: (state.engineTypes.enums || []).length,
                items: (state.engineTypes.enums || []).map((e) => ({
                    label: e.name,
                    badge: `${e.members.length}`,
                    kind: "enum" as TPropTypeKind,
                    type: e.name,
                    tsType: e.tsType,
                    defaultVal: e.members.length > 0 ? String(e.members[0].value) : "0",
                })),
            },
        ];

        const catMenu = this.$.typeCatMenu as HTMLElement;
        const subMenu = this.$.typeSubMenu as HTMLElement;
        const searchWrap = this.$.typeSubSearchWrap as HTMLElement;
        const searchInput = this.$.typeSubSearchInput as HTMLInputElement;
        catMenu.innerHTML = "";
        subMenu.classList.remove("show");

        const showCategorySubmenu = (catId: string, items: IFlyoutSubItem[]) => {
            catMenu.querySelectorAll(".type-cat-item").forEach((el) => {
                el.classList.toggle("active", (el as HTMLElement).dataset.cat === catId);
            });
            activeSubItems = items;
            searchInput.value = "";
            searchWrap.style.display = items.length > 6 ? "block" : "none";
            renderSubFlyoutList("");
            subMenu.classList.add("show");
        };

        for (const cat of categories) {
            const itemEl = document.createElement("div");
            itemEl.className = "type-cat-item";
            itemEl.dataset.cat = cat.id;
            const hasSub = !cat.directPick;
            itemEl.innerHTML = `
                <span>${escHtml(cat.title)}</span>
                <span class="cat-right">
                    ${cat.count !== undefined ? `<span>[${cat.count}]</span>` : ""}
                    ${hasSub ? `<span>▸</span>` : ""}
                </span>
            `;

            itemEl.addEventListener("mouseenter", () => {
                if (cat.directPick) {
                    catMenu.querySelectorAll(".type-cat-item").forEach((el) => el.classList.remove("active"));
                    itemEl.classList.add("active");
                    subMenu.classList.remove("show");
                } else {
                    showCategorySubmenu(cat.id, cat.items || []);
                }
            });

            itemEl.addEventListener("click", (ev) => {
                ev.stopPropagation();
                if (cat.directPick) {
                    onPick(cat.directPick);
                    closeTypeFlyout();
                } else {
                    showCategorySubmenu(cat.id, cat.items || []);
                }
            });

            catMenu.appendChild(itemEl);
        }

        (this.$.typeFlyoutBackdrop as HTMLElement).classList.add("show");
        (this.$.typeFlyoutRoot as HTMLElement).classList.add("show");
        clampFlyoutPosition(btnEl.getBoundingClientRect());
    };

    const buildDefaultControlHtml = (prop: IPropDef): string => {
        if (prop.kind === "enum" && prop.complex === "single") {
            const enumInfo = state.engineEnumLookup.get(prop.type);
            const members = enumInfo?.members || [];
            if (members.length > 0) {
                const curVal = prop.defaultValue !== undefined && prop.defaultValue !== ""
                    ? String(prop.defaultValue)
                    : String(members[0].value);
                const opts = members
                    .map((m) => {
                        const vStr = String(m.value);
                        return `<option value="${escHtml(vStr)}" ${vStr === curVal ? "selected" : ""}>${escHtml(m.name)} (${escHtml(vStr)})</option>`;
                    })
                    .join("");
                return `<select data-field="defaultValue">${opts}</select>`;
            }
        }
        const editableDef = isDefaultEditable(prop);
        return `<input type="text" data-field="defaultValue" value="${escHtml(editableDef ? (prop.defaultValue ?? "") : "")}" placeholder="${escHtml(defaultPlaceholder(prop))}" ${editableDef ? "" : "disabled"} />`;
    };

    const defaultPlaceholder = (prop: IPropDef): string => {
        if (prop.complex !== "single") return `(${prop.complex})`;
        if (prop.kind === "cocos") return "null";
        if (prop.kind === "component") return `new ${prop.type}()`;
        if (prop.kind === "enum") return "0";
        if (prop.type === "Int32Array" || prop.type === "Uint32Array") return "len (0)";
        if (prop.type === "boolean") return "false";
        if (prop.type === "string") return '""';
        if (prop.type === "object") return "{}";
        return "0";
    };

    const isDefaultEditable = (prop: IPropDef): boolean => {
        if (prop.complex !== "single") return false;
        if (prop.kind === "enum") return true;
        if (prop.kind !== "primitive") return false;
        return prop.type !== "object";
    };

    const updateCompPreview = () => {
        const pre = this.$.compEditor.querySelector("#comp-dts-preview") as HTMLElement | null;
        if (!pre || !state.draftComp) return;
        const previewComp: IComponentDef = {
            name: (state.draftComp.name || "NewComponent").trim() || "NewComponent",
            is_component: state.draftComp.is_component !== false,
            extends: Array.isArray(state.draftComp.extends) ? state.draftComp.extends.filter(Boolean) : [],
            props: state.draftComp.props.filter((p) => (p.name || "").trim().length > 0),
        };
        pre.textContent = generateComponentsDts([previewComp]);
    };

    const renderCompEditor = () => {
        const pane = this.$.compEditor as HTMLElement;
        if (!state.draftComp) {
            pane.innerHTML = `
                <div class="empty-state">
                    <div>Select a component from the left or create a new one.</div>
                    <button class="btn primary" id="btn-empty-new-comp">+ Create New Component</button>
                </div>
            `;
            pane.querySelector("#btn-empty-new-comp")?.addEventListener("click", startNewComponent);
            return;
        }

        const draft = state.draftComp;
        if (draft.is_component === undefined) draft.is_component = true;
        if (!Array.isArray(draft.extends)) draft.extends = [];
        const isNew = state.editingCompIndex === -1;
        const isComp = draft.is_component !== false;
        const selfOrigName = !isNew && state.editingCompIndex !== null
            ? state.schema.components[state.editingCompIndex]?.name || ""
            : "";

        pane.innerHTML = `
            <div class="section-card">
                <div class="section-head">
                    <span class="section-title">${isNew ? "New Component" : `Edit ${isComp ? "Component" : "Struct"}: ${escHtml(draft.name)}`}</span>
                </div>
                <div class="field-row">
                    <span class="field-label">Component Name</span>
                    <input class="grow" type="text" id="comp-name-input" value="${escHtml(draft.name)}" placeholder="e.g. Position, Health, Vec2" />
                </div>
                <div class="inline-err" id="comp-name-err"></div>
                <div class="field-row">
                    <span class="field-label">Is Component</span>
                    <label class="check-inline">
                        <input type="checkbox" id="comp-is-component-check" ${isComp ? "checked" : ""} />
                        <span>Attachable ECS Component (uncheck for reusable base/struct types like Vec2)</span>
                    </label>
                </div>
            </div>

            <div class="section-card">
                <div class="section-head">
                    <span class="section-title" id="extends-title">Extends (${draft.extends.length})</span>
                    <div class="item-btns">
                        <button class="btn sm" id="btn-toggle-extends">${draft.extends.length > 0 ? "Hide List" : "Select..."}</button>
                        <button class="btn sm" id="btn-clear-extends" ${draft.extends.length === 0 ? "disabled" : ""}>Clear</button>
                    </div>
                </div>
                <div class="extends-pills" id="extends-pills"></div>
                <div class="comp-checklist" id="extends-checklist" style="display:${draft.extends.length > 0 ? "grid" : "none"};"></div>
            </div>

            <div class="section-card">
                <div class="section-head">
                    <span class="section-title">Properties (${draft.props.length})</span>
                    <button class="btn sm primary" id="btn-add-prop">+ Add Prop</button>
                </div>
                <div class="prop-header">
                    <span>Prop Name</span>
                    <span>Type</span>
                    <span>Complex</span>
                    <span>Default</span>
                    <span>Actions</span>
                </div>
                <div class="prop-table" id="prop-rows"></div>
            </div>

            <div class="section-card" id="comp-worlds-card" style="display:${isComp ? "flex" : "none"};">
                <div class="section-head">
                    <span class="section-title" id="comp-worlds-title">Add to Worlds (${state.draftCompWorlds.length})</span>
                    <div class="item-btns">
                        <button class="btn sm" id="btn-toggle-comp-worlds">${state.draftCompWorlds.length > 0 ? "Hide List" : "Select..."}</button>
                        <button class="btn sm" id="btn-all-comp-worlds" ${state.schema.worlds.length === 0 ? "disabled" : ""}>All</button>
                        <button class="btn sm" id="btn-clear-comp-worlds" ${state.draftCompWorlds.length === 0 ? "disabled" : ""}>Clear</button>
                    </div>
                </div>
                <div class="extends-pills" id="comp-worlds-pills"></div>
                <div class="comp-checklist" id="comp-worlds-checklist" style="display:${state.draftCompWorlds.length > 0 ? "grid" : "none"};"></div>
            </div>

            <div class="section-card">
                <div class="section-head">
                    <span class="section-title">Generated .d.ts Preview</span>
                </div>
                <pre class="code-preview" id="comp-dts-preview"></pre>
            </div>

            <div class="footer-actions">
                <button class="btn" id="btn-cancel-comp">Cancel</button>
                <button class="btn success" id="btn-save-comp">Save & Generate</button>
            </div>
        `;

        const nameInput = pane.querySelector("#comp-name-input") as HTMLInputElement;
        const isCompCheck = pane.querySelector("#comp-is-component-check") as HTMLInputElement;
        const nameErrEl = pane.querySelector("#comp-name-err") as HTMLElement;
        const saveCompBtn = pane.querySelector("#btn-save-comp") as HTMLButtonElement;
        const extendsTitle = pane.querySelector("#extends-title") as HTMLElement;
        const extendsPills = pane.querySelector("#extends-pills") as HTMLElement;
        const extendsChecklist = pane.querySelector("#extends-checklist") as HTMLElement;
        const btnToggleExtends = pane.querySelector("#btn-toggle-extends") as HTMLButtonElement;
        const btnClearExtends = pane.querySelector("#btn-clear-extends") as HTMLButtonElement;
        let extendsOpen = draft.extends.length > 0;

        const compWorldsCard = pane.querySelector("#comp-worlds-card") as HTMLElement;
        const compWorldsTitle = pane.querySelector("#comp-worlds-title") as HTMLElement;
        const compWorldsPills = pane.querySelector("#comp-worlds-pills") as HTMLElement;
        const compWorldsChecklist = pane.querySelector("#comp-worlds-checklist") as HTMLElement;
        const btnToggleCompWorlds = pane.querySelector("#btn-toggle-comp-worlds") as HTMLButtonElement;
        const btnAllCompWorlds = pane.querySelector("#btn-all-comp-worlds") as HTMLButtonElement;
        const btnClearCompWorlds = pane.querySelector("#btn-clear-comp-worlds") as HTMLButtonElement;
        let compWorldsOpen = state.draftCompWorlds.length > 0;

        const renderCompWorldsUI = () => {
            const canRegister = draft.is_component !== false;
            compWorldsCard.style.display = canRegister ? "flex" : "none";
            if (!canRegister) return;

            const validWorldNames = new Set(state.schema.worlds.map((w) => w.name));
            state.draftCompWorlds = state.draftCompWorlds.filter((wn) => validWorldNames.has(wn));
            const selected = state.draftCompWorlds;

            compWorldsTitle.textContent = `Add to Worlds (${selected.length}/${state.schema.worlds.length})`;
            btnAllCompWorlds.disabled = state.schema.worlds.length === 0;
            btnClearCompWorlds.disabled = selected.length === 0;
            btnToggleCompWorlds.textContent = compWorldsOpen ? "Hide List" : "Select...";
            compWorldsChecklist.style.display = compWorldsOpen ? "grid" : "none";

            compWorldsPills.innerHTML = "";
            if (selected.length === 0) {
                compWorldsPills.innerHTML = `<span style="color:#777;font-size:11px;">Not registered to any world yet</span>`;
            } else {
                selected.forEach((wName) => {
                    const pill = document.createElement("span");
                    pill.className = "world-pill";
                    pill.innerHTML = `<span>${escHtml(wName)}</span><button type="button" title="Remove">&times;</button>`;
                    pill.querySelector("button")?.addEventListener("click", () => {
                        state.draftCompWorlds = state.draftCompWorlds.filter((n) => n !== wName);
                        renderCompWorldsUI();
                    });
                    compWorldsPills.appendChild(pill);
                });
            }

            compWorldsChecklist.innerHTML = "";
            if (state.schema.worlds.length === 0) {
                compWorldsChecklist.innerHTML = `<div style="color:#777;padding:4px 2px;grid-column:1/-1;">No worlds created yet. Create one in the "Worlds" tab.</div>`;
                return;
            }
            for (const w of state.schema.worlds) {
                const checked = selected.includes(w.name);
                const chip = document.createElement("label");
                chip.className = `comp-chip${checked ? " checked" : ""}`;
                chip.innerHTML = `
                    <input type="checkbox" ${checked ? "checked" : ""} />
                    <span>${escHtml(w.name)}</span>
                    <span class="badge blue" style="margin-left:auto;">${w.components.length}</span>
                `;
                const cb = chip.querySelector("input")!;
                cb.addEventListener("change", () => {
                    if (cb.checked) {
                        if (!state.draftCompWorlds.includes(w.name)) state.draftCompWorlds.push(w.name);
                    } else {
                        state.draftCompWorlds = state.draftCompWorlds.filter((n) => n !== w.name);
                    }
                    renderCompWorldsUI();
                });
                compWorldsChecklist.appendChild(chip);
            }
        };

        btnToggleCompWorlds.addEventListener("click", () => {
            compWorldsOpen = !compWorldsOpen;
            renderCompWorldsUI();
        });
        btnAllCompWorlds.addEventListener("click", () => {
            state.draftCompWorlds = state.schema.worlds.map((w) => w.name);
            renderCompWorldsUI();
        });
        btnClearCompWorlds.addEventListener("click", () => {
            state.draftCompWorlds = [];
            renderCompWorldsUI();
        });

        const checkCompDupName = (): boolean => {
            const candidate = (draft.name || "").trim();
            const isDup = !!candidate && state.schema.components.some(
                (c, idx) => idx !== state.editingCompIndex && c.name === candidate
            );
            nameInput.classList.toggle("input-err", isDup);
            nameErrEl.classList.toggle("show", isDup);
            nameErrEl.textContent = isDup ? `Duplicate component name "${candidate}" already exists.` : "";
            saveCompBtn.disabled = isDup;
            return isDup;
        };

        const renderExtendsUI = () => {
            const curName = (draft.name || "").trim();
            const candidates = state.schema.components.filter(
                (c) => c.name !== selfOrigName && (!curName || c.name !== curName)
            );
            const selected = draft.extends || [];
            extendsTitle.textContent = `Extends (${selected.length})`;
            btnClearExtends.disabled = selected.length === 0;
            btnToggleExtends.textContent = extendsOpen ? "Hide List" : "Select...";
            extendsChecklist.style.display = extendsOpen ? "grid" : "none";

            extendsPills.innerHTML = "";
            if (selected.length === 0) {
                extendsPills.innerHTML = `<span style="color:#777;font-size:11px;">None — standalone ECS component</span>`;
            } else {
                selected.forEach((pName) => {
                    const pill = document.createElement("span");
                    pill.className = "extends-pill";
                    pill.innerHTML = `<span>${escHtml(pName)}</span><button type="button" title="Remove">&times;</button>`;
                    pill.querySelector("button")?.addEventListener("click", () => {
                        draft.extends = (draft.extends || []).filter((n) => n !== pName);
                        renderExtendsUI();
                        updateCompPreview();
                    });
                    extendsPills.appendChild(pill);
                });
            }

            extendsChecklist.innerHTML = "";
            if (candidates.length === 0) {
                extendsChecklist.innerHTML = `<div style="color:#777;padding:4px 2px;grid-column:1/-1;">No other pTS-ECS components available to extend.</div>`;
                return;
            }
            for (const c of candidates) {
                const checked = selected.includes(c.name);
                const chip = document.createElement("label");
                chip.className = `comp-chip${checked ? " checked" : ""}`;
                chip.innerHTML = `
                    <input type="checkbox" ${checked ? "checked" : ""} />
                    <span>${escHtml(c.name)}</span>
                    ${c.is_component === false ? `<span class="badge amber" style="margin-left:auto;">Struct</span>` : `<span class="badge" style="margin-left:auto;">${c.props.length}</span>`}
                `;
                const cb = chip.querySelector("input")!;
                cb.addEventListener("change", () => {
                    const list = draft.extends || [];
                    if (cb.checked) {
                        if (!list.includes(c.name)) list.push(c.name);
                    } else {
                        draft.extends = list.filter((n) => n !== c.name);
                    }
                    renderExtendsUI();
                    updateCompPreview();
                });
                extendsChecklist.appendChild(chip);
            }
        };

        btnToggleExtends.addEventListener("click", () => {
            extendsOpen = !extendsOpen;
            renderExtendsUI();
        });
        btnClearExtends.addEventListener("click", () => {
            draft.extends = [];
            renderExtendsUI();
            updateCompPreview();
        });
        renderExtendsUI();
        renderCompWorldsUI();
        checkCompDupName();

        nameInput.addEventListener("input", () => {
            draft.name = nameInput.value;
            checkCompDupName();
            renderExtendsUI();
            updateCompPreview();
        });
        isCompCheck.addEventListener("change", () => {
            draft.is_component = isCompCheck.checked;
            if (!draft.is_component) {
                state.draftCompWorlds = [];
            }
            renderCompWorldsUI();
            updateCompPreview();
        });

        const rowsHost = pane.querySelector("#prop-rows") as HTMLElement;
        const renderPropRows = () => {
            rowsHost.innerHTML = "";
            if (draft.props.length === 0) {
                rowsHost.innerHTML = `<div style="color:#777;padding:8px 2px;">No properties (tag component). Click "+ Add Prop" to add fields.</div>`;
                updateCompPreview();
                return;
            }

            draft.props.forEach((prop, pIdx) => {
                const row = document.createElement("div");
                row.className = "prop-row";
                const complexOpts = COMPLEX_MODES.map((m) => {
                    const label = m === "single" ? "Single" : m === "array" ? "Array" : m === "set" ? "Set" : "Map<TKey, T>";
                    return `<option value="${m}" ${prop.complex === m ? "selected" : ""}>${label}</option>`;
                }).join("");

                const typeDisplay = prop.kind === "enum" ? `Enum: ${prop.type}` : prop.type;
                row.innerHTML = `
                    <input type="text" data-field="name" value="${escHtml(prop.name)}" placeholder="prop_name" />
                    <button type="button" class="type-picker-btn" data-field="type" title="${escHtml(`${prop.kind}: ${prop.type}`)}">
                        <span class="type-picker-label">${escHtml(typeDisplay)}</span>
                        <span class="type-picker-caret">▾</span>
                    </button>
                    <select data-field="complex">${complexOpts}</select>
                    ${buildDefaultControlHtml(prop)}
                    <div class="item-btns">
                        <button class="btn sm" data-up="${pIdx}" ${pIdx === 0 ? "disabled" : ""}>↑</button>
                        <button class="btn sm" data-dn="${pIdx}" ${pIdx === draft.props.length - 1 ? "disabled" : ""}>↓</button>
                        <button class="btn sm danger" data-rm="${pIdx}">×</button>
                    </div>
                `;

                const pNameEl = row.querySelector<HTMLInputElement>('[data-field="name"]')!;
                const pTypeBtn = row.querySelector<HTMLButtonElement>('[data-field="type"]')!;
                const pComplexEl = row.querySelector<HTMLSelectElement>('[data-field="complex"]')!;
                const pDefEl = row.querySelector<HTMLInputElement | HTMLSelectElement>('[data-field="defaultValue"]')!;

                pNameEl.addEventListener("input", () => {
                    prop.name = pNameEl.value;
                    updateCompPreview();
                });
                pTypeBtn.addEventListener("click", (ev) => {
                    ev.stopPropagation();
                    openTypeFlyout(pTypeBtn, prop, draft.name, (picked) => {
                        prop.kind = picked.kind;
                        prop.type = picked.type;
                        prop.tsType = picked.tsType;
                        if (picked.kind === "enum") {
                            prop.defaultValue = picked.defaultVal ?? "0";
                        } else if (picked.kind !== "primitive") {
                            prop.defaultValue = "";
                        }
                        renderPropRows();
                    });
                });
                pComplexEl.addEventListener("change", () => {
                    prop.complex = pComplexEl.value as TPropComplex;
                    renderPropRows();
                });
                pDefEl.addEventListener("input", () => {
                    prop.defaultValue = pDefEl.value;
                });
                pDefEl.addEventListener("change", () => {
                    prop.defaultValue = pDefEl.value;
                });

                row.querySelector<HTMLButtonElement>("[data-up]")?.addEventListener("click", () => {
                    if (pIdx <= 0) return;
                    const tmp = draft.props[pIdx - 1];
                    draft.props[pIdx - 1] = draft.props[pIdx];
                    draft.props[pIdx] = tmp;
                    renderPropRows();
                });
                row.querySelector<HTMLButtonElement>("[data-dn]")?.addEventListener("click", () => {
                    if (pIdx >= draft.props.length - 1) return;
                    const tmp = draft.props[pIdx + 1];
                    draft.props[pIdx + 1] = draft.props[pIdx];
                    draft.props[pIdx] = tmp;
                    renderPropRows();
                });
                row.querySelector<HTMLButtonElement>("[data-rm]")?.addEventListener("click", () => {
                    draft.props.splice(pIdx, 1);
                    renderPropRows();
                });

                rowsHost.appendChild(row);
            });
            updateCompPreview();
        };

        renderPropRows();

        pane.querySelector("#btn-add-prop")?.addEventListener("click", () => {
            draft.props.push({
                name: "",
                kind: "primitive",
                type: "float",
                complex: "single",
                defaultValue: "",
            });
            renderPropRows();
        });

        pane.querySelector("#btn-cancel-comp")?.addEventListener("click", () => {
            clearBanner();
            state.editingCompIndex = null;
            state.draftComp = null;
            renderCompList();
            renderCompEditor();
        });

        pane.querySelector("#btn-save-comp")?.addEventListener("click", async () => {
            if (checkCompDupName()) {
                showBanner(`Duplicate component name "${(draft.name || "").trim()}" already exists.`, true);
                return;
            }
            const cleanedExtends = Array.isArray(draft.extends)
                ? draft.extends.map((e) => String(e ?? "").trim()).filter(Boolean)
                : [];
            const cleaned: IComponentDef = {
                name: (draft.name || "").trim(),
                ...(draft.is_component === false ? { is_component: false } : {}),
                ...(cleanedExtends.length > 0 ? { extends: cleanedExtends } : {}),
                props: draft.props.map((p) => ({
                    name: (p.name || "").trim(),
                    kind: p.kind,
                    type: p.type,
                    complex: p.complex,
                    defaultValue: (p.defaultValue ?? "").trim(),
                    ...((p.kind === "cocos" || p.kind === "enum") && p.tsType ? { tsType: p.tsType } : {}),
                })),
            };

            const next = cloneSchema(state.schema);
            const oldName = state.editingCompIndex !== null && state.editingCompIndex >= 0
                ? next.components[state.editingCompIndex].name
                : null;

            if (isNew) {
                next.components.push(cleaned);
            } else if (state.editingCompIndex !== null) {
                next.components[state.editingCompIndex] = cleaned;
                // Cascade rename inside other components (props & extends)
                if (oldName && oldName !== cleaned.name) {
                    for (const c of next.components) {
                        for (const p of c.props) {
                            if (p.kind === "component" && p.type === oldName) p.type = cleaned.name;
                        }
                        if (Array.isArray(c.extends)) {
                            c.extends = c.extends.map((en) => (en === oldName ? cleaned.name : en));
                        }
                    }
                }
            }

            // Sync quick-assigned world memberships (and strip if converted to non-component Struct)
            const selectedWorlds = new Set(cleaned.is_component !== false ? state.draftCompWorlds : []);
            for (const w of next.worlds) {
                // First apply any rename in-place so existing bit order is preserved
                if (oldName && oldName !== cleaned.name) {
                    w.components = w.components.map((cn) => (cn === oldName ? cleaned.name : cn));
                }
                const want = selectedWorlds.has(w.name);
                const has = w.components.includes(cleaned.name);
                if (want && !has) {
                    w.components.push(cleaned.name);
                } else if (!want && has) {
                    w.components = w.components.filter((cn) => cn !== cleaned.name);
                }
            }

            if (await persistSchema(next, `Saved component "${cleaned.name}" -> regenerated _$secret components & worlds.`)) {
                state.editingCompIndex = isNew ? state.schema.components.length - 1 : state.editingCompIndex;
                state.draftComp = JSON.parse(JSON.stringify(state.schema.components[state.editingCompIndex!]));
                if (state.draftComp!.is_component === undefined) state.draftComp!.is_component = true;
                if (!Array.isArray(state.draftComp!.extends)) state.draftComp!.extends = [];
                state.draftCompWorlds = state.schema.worlds
                    .filter((w) => w.components.includes(cleaned.name))
                    .map((w) => w.name);
                renderCompList();
                renderCompEditor();
            }
        });
    };

    const startNewComponent = () => {
        clearBanner();
        state.editingCompIndex = -1;
        state.draftComp = { name: "", is_component: true, extends: [], props: [] };
        state.draftCompWorlds = [];
        renderCompList();
        renderCompEditor();
    };

    this.$.btnNewComp.addEventListener("click", startNewComponent);
    this.$.filterComp.addEventListener("input", renderCompList);

    // ─── Worlds Sub-Panel ───
    const renderWorldList = () => {
        const q = String(this.$.filterWorld.value || "").trim().toLowerCase();
        const container = this.$.worldList as HTMLElement;
        container.innerHTML = "";

        const items = state.schema.worlds
            .map((w, idx) => ({ w, idx }))
            .filter(({ w }) => !q || w.name.toLowerCase().includes(q));

        if (items.length === 0) {
            container.innerHTML = `<div style="color:#777;padding:12px;text-align:center;">No worlds yet.</div>`;
            return;
        }

        for (const { w, idx } of items) {
            const div = document.createElement("div");
            div.className = `list-item${state.editingWorldIndex === idx ? " selected" : ""}`;
            const maxLabel = w.max_entities === "Infinity" ? "∞" : String(w.max_entities);
            const evMode = w.event_mode === "manual" ? "manual" : "primitive";
            const evBadge = evMode === "manual"
                ? `<span class="badge blue">${(w.events || []).length} events</span>`
                : `<span class="badge">events: any</span>`;
            div.innerHTML = `
                <div class="list-item-top">
                    <span class="item-title">${escHtml(w.name)}</span>
                    <div class="item-btns">
                        <button class="btn sm danger" data-del="${idx}" title="Delete">×</button>
                    </div>
                </div>
                <div class="item-meta">
                    <span class="badge">${w.components.length} comps</span>
                    <span class="badge amber">max: ${escHtml(maxLabel)}</span>
                    ${evBadge}
                    ${w.auto_boost ? `<span class="badge green">Auto Boost</span>` : `<span class="badge">Lazy</span>`}
                </div>
            `;
            div.addEventListener("click", (ev) => {
                const target = ev.target as HTMLElement;
                if (target.dataset.del !== undefined) return;
                clearBanner();
                state.editingWorldIndex = idx;
                state.draftWorld = JSON.parse(JSON.stringify(state.schema.worlds[idx]));
                renderWorldList();
                renderWorldEditor();
            });
            div.querySelector<HTMLButtonElement>("[data-del]")?.addEventListener("click", async (ev) => {
                ev.stopPropagation();
                const next = cloneSchema(state.schema);
                next.worlds.splice(idx, 1);
                if (await persistSchema(next, `Deleted world "${w.name}" and regenerated _$secret/ecs.worlds.(js|d.ts).`)) {
                    if (state.editingWorldIndex === idx) {
                        state.editingWorldIndex = null;
                        state.draftWorld = null;
                    } else if (state.editingWorldIndex !== null && state.editingWorldIndex > idx) {
                        state.editingWorldIndex--;
                    }
                    renderWorldList();
                    renderWorldEditor();
                }
            });
            container.appendChild(div);
        }
    };

    const updateWorldPreview = () => {
        const pre = this.$.worldEditor.querySelector("#world-dts-preview") as HTMLElement | null;
        if (!pre || !state.draftWorld) return;
        const previewWorld: IWorldDef = {
            ...state.draftWorld,
            name: (state.draftWorld.name || "my_world").trim() || "my_world",
        };
        const dts = generateWorldsDts([previewWorld]);
        pre.textContent = `${dts}// Usage:\nconst world = ecs.get_world(${JSON.stringify(previewWorld.name)});\n`;
    };

    const renderWorldEditor = () => {
        const pane = this.$.worldEditor as HTMLElement;
        if (!state.draftWorld) {
            pane.innerHTML = `
                <div class="empty-state">
                    <div>Select a world from the left or create a new one.</div>
                    <button class="btn primary" id="btn-empty-new-world">+ Create New World</button>
                </div>
            `;
            pane.querySelector("#btn-empty-new-world")?.addEventListener("click", startNewWorld);
            return;
        }

        const draft = state.draftWorld;
        if (draft.event_mode !== "manual" && draft.event_mode !== "primitive") {
            draft.event_mode = "primitive";
        }
        if (!Array.isArray(draft.events)) {
            draft.events = [];
        }
        const isNew = state.editingWorldIndex === -1;
        const isInf = draft.max_entities === "Infinity";
        const isManualEv = draft.event_mode === "manual";

        pane.innerHTML = `
            <div class="section-card">
                <div class="section-head">
                    <span class="section-title">${isNew ? "New World" : `Edit World: ${escHtml(draft.name)}`}</span>
                </div>
                <div class="field-row">
                    <span class="field-label">World Name</span>
                    <input class="grow" type="text" id="world-name-input" value="${escHtml(draft.name)}" placeholder="e.g. combat, gameplay, fx" />
                </div>
                <div class="inline-err" id="world-name-err"></div>
                <div class="field-row">
                    <span class="field-label">Max Entities</span>
                    <input type="number" id="world-max-input" min="1" step="1" value="${isInf ? 5000 : Number(draft.max_entities)}" ${isInf ? "disabled" : ""} style="width:120px;" />
                    <label class="check-inline">
                        <input type="checkbox" id="world-inf-check" ${isInf ? "checked" : ""} />
                        <span>Unlimited (Infinity)</span>
                    </label>
                </div>
                <div class="field-row">
                    <span class="field-label">Auto Boost</span>
                    <label class="check-inline">
                        <input type="checkbox" id="world-boost-check" ${draft.auto_boost ? "checked" : ""} />
                        <span>Instantiate immediately when game boots (unchecked = lazy on first ecs.get_world)</span>
                    </label>
                </div>
                <div class="field-row">
                    <span class="field-label">Events</span>
                    <select id="world-event-mode" style="min-width:190px;">
                        <option value="primitive" ${!isManualEv ? "selected" : ""}>Primitive (string | symbol)</option>
                        <option value="manual" ${isManualEv ? "selected" : ""}>Manually Build</option>
                    </select>
                </div>
            </div>

            <div class="section-card" id="world-events-card" style="${isManualEv ? "" : "display:none;"}">
                <div class="section-head">
                    <span class="section-title" id="world-events-title">Manual Events (${draft.events.length})</span>
                    <button class="btn sm primary" id="btn-add-event">+ Add Event</button>
                </div>
                <div class="prop-table" id="world-event-rows"></div>
            </div>

            <div class="section-card">
                <div class="section-head">
                    <span class="section-title" id="world-comps-title">Registered Components (${draft.components.length}/${state.schema.components.length})</span>
                    <div class="item-btns">
                        <button class="btn sm" id="btn-select-all-comps">Select All</button>
                        <button class="btn sm" id="btn-clear-all-comps">Clear</button>
                    </div>
                </div>
                <div class="comp-checklist" id="world-comp-checklist"></div>
            </div>

            <div class="section-card">
                <div class="section-head">
                    <span class="section-title">Generated .d.ts & Usage Preview</span>
                </div>
                <pre class="code-preview" id="world-dts-preview"></pre>
            </div>

            <div class="footer-actions">
                <button class="btn" id="btn-cancel-world">Cancel</button>
                <button class="btn success" id="btn-save-world">Save & Generate</button>
            </div>
        `;

        const nameInput = pane.querySelector("#world-name-input") as HTMLInputElement;
        const worldNameErrEl = pane.querySelector("#world-name-err") as HTMLElement;
        const saveWorldBtn = pane.querySelector("#btn-save-world") as HTMLButtonElement;
        const maxInput = pane.querySelector("#world-max-input") as HTMLInputElement;

        const checkWorldDupName = (): boolean => {
            const candidate = (draft.name || "").trim();
            const isDup = !!candidate && state.schema.worlds.some(
                (w, idx) => idx !== state.editingWorldIndex && w.name === candidate
            );
            nameInput.classList.toggle("input-err", isDup);
            worldNameErrEl.classList.toggle("show", isDup);
            worldNameErrEl.textContent = isDup ? `Duplicate world name "${candidate}" already exists.` : "";
            saveWorldBtn.disabled = isDup;
            return isDup;
        };
        const infCheck = pane.querySelector("#world-inf-check") as HTMLInputElement;
        const boostCheck = pane.querySelector("#world-boost-check") as HTMLInputElement;
        const evModeSelect = pane.querySelector("#world-event-mode") as HTMLSelectElement;
        const evCard = pane.querySelector("#world-events-card") as HTMLElement;
        const evTitle = pane.querySelector("#world-events-title") as HTMLElement;
        const evRows = pane.querySelector("#world-event-rows") as HTMLElement;

        const renderEventRows = () => {
            evRows.innerHTML = "";
            const evs = draft.events || [];
            evTitle.textContent = `Manual Events (${evs.length})`;
            if (evs.length === 0) {
                evRows.innerHTML = `<div style="color:#777;padding:4px 2px;">Click "+ Add Event" to declare typed event names (e.g. on_hit, on_move).</div>`;
                updateWorldPreview();
                return;
            }
            evs.forEach((evName, eIdx) => {
                const row = document.createElement("div");
                row.className = "field-row";
                row.innerHTML = `
                    <input class="grow" type="text" value="${escHtml(evName)}" placeholder="e.g. on_hit, on_move" />
                    <button class="btn sm danger" title="Remove">×</button>
                `;
                const inp = row.querySelector("input")!;
                inp.addEventListener("input", () => {
                    draft.events![eIdx] = inp.value;
                    updateWorldPreview();
                });
                row.querySelector("button")!.addEventListener("click", () => {
                    draft.events!.splice(eIdx, 1);
                    renderEventRows();
                });
                evRows.appendChild(row);
            });
            updateWorldPreview();
        };

        renderEventRows();

        evModeSelect.addEventListener("change", () => {
            draft.event_mode = evModeSelect.value === "manual" ? "manual" : "primitive";
            evCard.style.display = draft.event_mode === "manual" ? "" : "none";
            if (draft.event_mode === "manual" && (!draft.events || draft.events.length === 0)) {
                draft.events = ["on_hit"];
            }
            renderEventRows();
        });

        pane.querySelector("#btn-add-event")?.addEventListener("click", () => {
            draft.events = draft.events || [];
            draft.events.push("");
            renderEventRows();
        });

        checkWorldDupName();

        nameInput.addEventListener("input", () => {
            draft.name = nameInput.value;
            checkWorldDupName();
            updateWorldPreview();
        });
        maxInput.addEventListener("input", () => {
            if (!infCheck.checked) {
                draft.max_entities = Math.max(1, Math.floor(Number(maxInput.value) || 1));
            }
        });
        infCheck.addEventListener("change", () => {
            maxInput.disabled = infCheck.checked;
            draft.max_entities = infCheck.checked ? "Infinity" : Math.max(1, Math.floor(Number(maxInput.value) || 5000));
        });
        boostCheck.addEventListener("change", () => {
            draft.auto_boost = boostCheck.checked;
        });

        const worldEligibleComps = () => state.schema.components.filter((c) => c.is_component !== false);
        const checklist = pane.querySelector("#world-comp-checklist") as HTMLElement;
        const compsTitle = pane.querySelector("#world-comps-title") as HTMLElement;
        const renderChecklist = () => {
            checklist.innerHTML = "";
            const eligible = worldEligibleComps();
            if (compsTitle) {
                compsTitle.textContent = `Registered Components (${draft.components.length}/${eligible.length})`;
            }
            if (eligible.length === 0) {
                checklist.innerHTML = `<div style="color:#777;">Create attachable components in the "Components" tab first.</div>`;
                updateWorldPreview();
                return;
            }
            const selectedSet = new Set(draft.components);
            for (const c of eligible) {
                const checked = selectedSet.has(c.name);
                const label = document.createElement("label");
                label.className = `comp-chip${checked ? " checked" : ""}`;
                label.innerHTML = `
                    <input type="checkbox" ${checked ? "checked" : ""} />
                    <span>${escHtml(c.name)}</span>
                `;
                const cb = label.querySelector("input")!;
                cb.addEventListener("change", () => {
                    if (cb.checked) {
                        if (!draft.components.includes(c.name)) draft.components.push(c.name);
                    } else {
                        draft.components = draft.components.filter((n) => n !== c.name);
                    }
                    label.classList.toggle("checked", cb.checked);
                    if (compsTitle) {
                        compsTitle.textContent = `Registered Components (${draft.components.length}/${worldEligibleComps().length})`;
                    }
                    updateWorldPreview();
                });
                checklist.appendChild(label);
            }
            updateWorldPreview();
        };
        renderChecklist();

        pane.querySelector("#btn-select-all-comps")?.addEventListener("click", () => {
            draft.components = worldEligibleComps().map((c) => c.name);
            renderChecklist();
        });
        pane.querySelector("#btn-clear-all-comps")?.addEventListener("click", () => {
            draft.components = [];
            renderChecklist();
        });

        pane.querySelector("#btn-cancel-world")?.addEventListener("click", () => {
            clearBanner();
            state.editingWorldIndex = null;
            state.draftWorld = null;
            renderWorldList();
            renderWorldEditor();
        });

        pane.querySelector("#btn-save-world")?.addEventListener("click", async () => {
            if (checkWorldDupName()) {
                showBanner(`Duplicate world name "${(draft.name || "").trim()}" already exists.`, true);
                return;
            }
            const evMode = evModeSelect.value === "manual" ? "manual" : "primitive";
            const cleaned: IWorldDef = {
                name: (draft.name || "").trim(),
                components: [...draft.components],
                max_entities: infCheck.checked ? "Infinity" : Math.max(1, Math.floor(Number(maxInput.value) || 1)),
                auto_boost: boostCheck.checked,
                event_mode: evMode,
                events: evMode === "manual" ? (draft.events || []).map((e) => String(e ?? "").trim()) : [],
            };

            const next = cloneSchema(state.schema);
            if (isNew) {
                next.worlds.push(cleaned);
            } else if (state.editingWorldIndex !== null) {
                next.worlds[state.editingWorldIndex] = cleaned;
            }

            if (await persistSchema(next, `Saved world "${cleaned.name}" -> generated _$secret/ecs.worlds.(js|d.ts).`)) {
                state.editingWorldIndex = isNew ? state.schema.worlds.length - 1 : state.editingWorldIndex;
                state.draftWorld = JSON.parse(JSON.stringify(state.schema.worlds[state.editingWorldIndex!]));
                renderWorldList();
                renderWorldEditor();
            }
        });
    };

    const startNewWorld = () => {
        clearBanner();
        state.editingWorldIndex = -1;
        state.draftWorld = {
            name: "",
            components: [],
            max_entities: 5000,
            auto_boost: true,
            event_mode: "primitive",
            events: [],
        };
        renderWorldList();
        renderWorldEditor();
    };

    this.$.btnNewWorld.addEventListener("click", startNewWorld);
    this.$.filterWorld.addEventListener("input", renderWorldList);

    let lastFocusRefresh = 0;
    const onPanelFocus = () => {
        const now = Date.now();
        if (now - lastFocusRefresh < 1500) return;
        lastFocusRefresh = now;
        void loadEngineTypes(false);
    };
    window.addEventListener("focus", onPanelFocus);
    (this as any)._onPanelFocus = onPanelFocus;

    await Promise.all([loadEngineTypes(false), loadSchema()]);
};

export const close = function (this: any) {
    if (this._onPanelFocus) {
        window.removeEventListener("focus", this._onPanelFocus);
        this._onPanelFocus = null;
    }
    this._onRequestUpdatePanel = null;
};

export const methods: Record<string, (...args: any[]) => any> = {
    onRequestUpdatePanel(this: any, incoming?: IEcsSchemaProfile) {
        if (typeof this._onRequestUpdatePanel === "function") {
            // Fire-and-forget async UI refresh (never blocks sender)
            void this._onRequestUpdatePanel(incoming);
        }
    },
};
