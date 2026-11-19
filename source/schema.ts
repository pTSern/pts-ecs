export const PRIMITIVE_TYPES = [
    "float",
    "int",
    "string",
    "boolean",
    "object",
    "Int32Array",
    "Uint32Array",
] as const;

export const DEFAULT_COCOS_COMPONENTS = [
    "cc.Component",
    "cc.Sprite",
    "cc.Label",
    "cc.UITransform",
    "cc.Widget",
    "cc.Layout",
    "cc.Button",
    "cc.Camera",
    "cc.Canvas",
    "cc.Animation",
    "cc.AudioSource",
    "cc.RigidBody2D",
    "cc.BoxCollider2D",
    "cc.CircleCollider2D",
    "cc.PolygonCollider2D",
    "cc.ParticleSystem2D",
    "cc.UIOpacity",
    "cc.Graphics",
    "cc.Mask",
    "cc.ScrollView",
    "cc.ProgressBar",
    "cc.RichText",
] as const;

export const DEFAULT_COCOS_ASSETS = [
    "cc.Asset",
    "cc.Prefab",
    "cc.SpriteFrame",
    "cc.SpriteAtlas",
    "cc.Texture2D",
    "cc.ImageAsset",
    "cc.AudioClip",
    "cc.AnimationClip",
    "cc.Material",
    "cc.EffectAsset",
    "cc.JsonAsset",
    "cc.TextAsset",
    "cc.BufferAsset",
    "cc.Font",
    "cc.TTFFont",
    "cc.BitmapFont",
    "cc.TiledMapAsset",
    "cc.ParticleAsset",
] as const;

export const COMPLEX_MODES = [
    "single",
    "array",
    "set",
    "map",
] as const;

export const WORLD_EVENT_MODES = [
    "primitive",
    "manual",
] as const;

export type TPrimitiveType = typeof PRIMITIVE_TYPES[number];
export type TPropTypeKind = "primitive" | "cocos" | "component" | "enum";
export type TPropComplex = typeof COMPLEX_MODES[number];
export type TWorldEventMode = typeof WORLD_EVENT_MODES[number];

export interface IEnumMemberOption {
    name: string;
    value: number | string;
}

export interface IEngineEnumOption {
    name: string;        // e.g. "KeyCode", "EAnimState", "cc.Sprite.Type"
    isBuiltin: boolean;
    tsType: string;      // e.g. `import("cc").KeyCode` or `import("db://...").EAnimState`
    members: IEnumMemberOption[];
}

export interface IEngineTypeOption {
    name: string;        // e.g. "cc.Sprite", "Config_Enemy", "cc.Node"
    ctorName: string;
    category: "node" | "component" | "asset";
    isBuiltin: boolean;
    tsType: string;      // e.g. `import("cc").Sprite` or `import("db://...").Config_Enemy`
}

export interface IEngineTypesPayload {
    nodes: IEngineTypeOption[];
    components: IEngineTypeOption[];
    assets: IEngineTypeOption[];
    enums: IEngineEnumOption[];
}

export const DEFAULT_COCOS_ENUMS: IEngineEnumOption[] = [
    {
        name: "KeyCode",
        isBuiltin: true,
        tsType: 'import("cc").KeyCode',
        members: [
            { name: "NONE", value: 0 },
            { name: "BACKSPACE", value: 8 },
            { name: "TAB", value: 9 },
            { name: "ENTER", value: 13 },
            { name: "SHIFT_LEFT", value: 16 },
            { name: "CTRL_LEFT", value: 17 },
            { name: "ALT_LEFT", value: 18 },
            { name: "ESCAPE", value: 27 },
            { name: "SPACE", value: 32 },
            { name: "ARROW_LEFT", value: 37 },
            { name: "ARROW_UP", value: 38 },
            { name: "ARROW_RIGHT", value: 39 },
            { name: "ARROW_DOWN", value: 40 },
            { name: "DIGIT_0", value: 48 },
            { name: "DIGIT_1", value: 49 },
            { name: "DIGIT_2", value: 50 },
            { name: "DIGIT_3", value: 51 },
            { name: "KEY_A", value: 65 },
            { name: "KEY_D", value: 68 },
            { name: "KEY_E", value: 69 },
            { name: "KEY_F", value: 70 },
            { name: "KEY_Q", value: 81 },
            { name: "KEY_R", value: 82 },
            { name: "KEY_S", value: 83 },
            { name: "KEY_W", value: 87 },
        ],
    },
    {
        name: "MobilityMode",
        isBuiltin: true,
        tsType: 'import("cc").MobilityMode',
        members: [
            { name: "Static", value: 0 },
            { name: "Stationary", value: 1 },
            { name: "Movable", value: 2 },
        ],
    },
    {
        name: "NodeSpace",
        isBuiltin: true,
        tsType: 'import("cc").NodeSpace',
        members: [
            { name: "LOCAL", value: 0 },
            { name: "WORLD", value: 1 },
        ],
    },
];

export interface IPropDef {
    name: string;
    kind: TPropTypeKind;
    type: string;
    complex: TPropComplex;
    defaultValue?: string;
    /** Optional resolved TypeScript type expression for dynamic Cocos/custom Component, Asset & Enum types. */
    tsType?: string;
}

export interface IComponentDef {
    name: string;
    /**
     * Whether this definition is a real ECS component attachable to Worlds (default: true).
     * Set to false for reusable base/struct types (e.g. Vec2) meant only to be extended or nested as properties.
     */
    is_component?: boolean;
    /** Optional list of parent pTS-ECS component/struct names this definition extends. */
    extends?: string[];
    props: IPropDef[];
}

export interface IWorldDef {
    name: string;
    components: string[];
    max_entities: number | "Infinity";
    auto_boost: boolean;
    /** Event channel typing mode: "primitive" = string | symbol, "manual" = explicit string literal union */
    event_mode?: TWorldEventMode;
    /** Explicit event channel names when event_mode === "manual" (e.g. ["on_hit", "on_move"]) */
    events?: string[];
}

export interface IEcsSchemaProfile {
    components: IComponentDef[];
    worlds: IWorldDef[];
}

export interface IValidationResult {
    ok: boolean;
    errors: string[];
}
