// Thin ES-module re-export backed directly by the plugin singleton `globalThis.pTS.ecs`.
const _$root: any =
    typeof globalThis !== "undefined"
        ? globalThis
        : typeof window !== "undefined"
            ? window
            : typeof self !== "undefined"
                ? self
                : {};

export const ecs: pTS.ecs_types.IPtsEcs = _$root.pTS?.ecs;

export default ecs;

export namespace ecs {
    export type TWorld<_TMap extends pTS.ecs_types.TComponentMap = pTS.ecs_types.TComponentMap> =
        pTS.ecs_types.IBoundWorld<_TMap>;
}

export type TBit<_TComp = any> = pTS.ecs_types.TBit<_TComp>;
export type TComponentOf<_T> = pTS.ecs_types.TComponentOf<_T>;
export type ICollision = pTS.ecs_types.ICollision;
export type ICollideTarget = pTS.ecs_types.ICollideTarget;
export type ICollideOptions = pTS.ecs_types.ICollideOptions;
export type IBoundWorld<_TMap extends pTS.ecs_types.TComponentMap = pTS.ecs_types.TComponentMap> =
    pTS.ecs_types.IBoundWorld<_TMap>;
export type TWorldName = pTS.ecs_types.TWorldName;
export type TComponentName = pTS.ecs_types.TComponentName;
