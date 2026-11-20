// Ensure generated @ccclass DTOs (when enabled in Settings) self-register into pTS.__ecs_schema__.dtos
import "./ecs.dto";

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
    export namespace types {
        export type Base_CCClass_Component = pTS.ecs_types.Base_CCClass_Component;
        export type TComponentDtoBase = pTS.ecs_types.TComponentDtoBase;
        export type IComponentDtoMap = pTS.ecs_types.IComponentDtoMap;
        export type IComponentMap = pTS.ecs_types.IComponentMap;
        export type IWorldComponentMaps = pTS.ecs_types.IWorldComponentMaps;
        export type IWorldEventMaps = pTS.ecs_types.IWorldEventMaps;
        export type TComponentName = pTS.ecs_types.TComponentName;
        export type TWorldName = pTS.ecs_types.TWorldName;
        export type TWorldEvent<_K extends pTS.ecs_types.TWorldName = pTS.ecs_types.TWorldName> =
            pTS.ecs_types.TWorldEvent<_K>;
        export type TBit<_TComp = any> = pTS.ecs_types.TBit<_TComp>;
        export type TComponentOf<_T> = pTS.ecs_types.TComponentOf<_T>;
        export type IBoundWorld<
            _TMap extends pTS.ecs_types.TComponentMap = pTS.ecs_types.TComponentMap,
            _TEvent = string | symbol,
        > = pTS.ecs_types.IBoundWorld<_TMap, _TEvent>;
        export type ICollision = pTS.ecs_types.ICollision;
        export type ICollideTarget = pTS.ecs_types.ICollideTarget;
        export type ICollideOptions = pTS.ecs_types.ICollideOptions;
        export type Comp<_K extends pTS.ecs_types.TComponentName> = pTS.ecs_types.IComponentMap[_K];
        export type Dto<_K extends keyof pTS.ecs_types.IComponentDtoMap> = InstanceType<pTS.ecs_types.IComponentDtoMap[_K]>;
    }
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
