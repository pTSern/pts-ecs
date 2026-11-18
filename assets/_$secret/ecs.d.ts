// Core Ambient Type Declarations for pts-ecs
// Augmented automatically by generated ecs.components.d.ts and ecs.worlds.d.ts.

declare namespace pTS {
    export namespace ecs_types {
        /** Augmented by generated ecs.components.d.ts */
        export interface IComponentMap {}

        /** Augmented by generated ecs.worlds.d.ts */
        export interface IWorldComponentMaps {}

        /** Augmented by generated ecs.worlds.d.ts (per-world event channel union or string | symbol) */
        export interface IWorldEventMaps {}

        export type TComponentName = keyof IComponentMap;
        export type TWorldName = keyof IWorldComponentMaps;
        export type TWorldEvent<_K extends TWorldName = TWorldName> =
            _K extends keyof IWorldEventMaps ? IWorldEventMaps[_K] : (string | symbol);

        export type TKey = string | symbol | number;

        export interface IVec2Like {
            x: number;
            y: number;
        }

        export interface ICollision {
            radius: number;
        }

        export interface ICollideTarget {
            id?: number;
            x?: number;
            y?: number;
            radius?: number;
            on_hit?: (attacker_id: number, target_id: number) => void;
        }

        export interface ICollideOptions {
            chunk_size?: number;
            iterations?: number;
            target?: ICollideTarget;
            on_collide?: (id_a: number, id_b: number) => void;
        }

        export type TBit<_TComp = any> = number & { readonly __ecs_comp__?: _TComp };
        export type TComponentOf<_T> = _T extends TBit<infer _TComp> ? _TComp : never;
        export type TBitTuple<_TBits extends readonly TBit<any>[]> = {
            [K in keyof _TBits]: TComponentOf<_TBits[K]>;
        };

        export type TComponentMap = Record<string, object>;
        export type TComponentTemplate<_T extends object> = _T | (() => _T);
        export type TWorldTemplates<_TMap extends TComponentMap> = {
            [K in keyof _TMap]: TComponentTemplate<_TMap[K]>;
        };

        export interface IWorldCreator<_TMap extends TComponentMap> {
            /** Unique world name (throws if empty or already exists). */
            name: string;
            components: TWorldTemplates<_TMap>;
            capacity?: number;
            max_entities?: number;
        }

        export interface IBoundEntityAPI {
            add(...bits: TBit<any>[]): number;
            remove(id: number): void;
            flag(id: number): Uint32Array;
            has_all(id: number, mask: Uint32Array): boolean;
            has_any(id: number, mask: Uint32Array): boolean;
            count(): number;
        }

        export interface IBoundComponentAPI {
            add<_TComp extends object>(id: number, bit: TBit<_TComp>, prop?: _TComp): _TComp;
            get<_TComp extends object>(id: number, bit: TBit<_TComp>, default_prop: _TComp): _TComp;
            get<_TComp extends object>(id: number, bit: TBit<_TComp>): _TComp | undefined;
            has(id: number, bit: TBit<any>): boolean;
            remove(id: number, bit: TBit<any>): boolean;
        }

        export interface IBoundEventAPI<_TEvent = string | symbol> {
            push(channel: _TEvent, a: number, b?: number): void;
            flush(channel: _TEvent, handler: (a: number, b: number) => void): number;
            clear(channel?: _TEvent): void;
        }

        /** Bound World Facade — self-contained ECS instance identified by unique `name`. */
        export interface IBoundWorld<_TMap extends TComponentMap = TComponentMap, _TEvent = string | symbol> {
            readonly name: string;
            readonly entities: Set<number>;
            masks: Uint32Array;
            readonly word_count: number;
            readonly max_entities: number;
            readonly bits: { readonly [K in keyof _TMap]: TBit<_TMap[K]> };

            readonly entity: IBoundEntityAPI;
            readonly component: IBoundComponentAPI;
            readonly event: IBoundEventAPI<_TEvent>;

            mask(...bits: TBit<any>[]): Uint32Array;
            match(flag: Uint32Array, req: Uint32Array): boolean;
            query<_TBits extends readonly TBit<any>[]>(
                bits: readonly [..._TBits],
                callback: (id: number, ...components: TBitTuple<_TBits>) => void,
            ): void;
            collide(
                pos_bit: TBit<IVec2Like>,
                col_bit: TBit<ICollision>,
                opts?: ICollideOptions,
            ): void;
            reset(): void;
            destroy(): void;
        }

        export interface IPtsEcs {
            create_world<_TMap extends TComponentMap, _TEvent = string | symbol>(
                args: IWorldCreator<_TMap>,
            ): IBoundWorld<_TMap, _TEvent>;
            get_world<_K extends TWorldName>(
                name: _K,
            ): IBoundWorld<IWorldComponentMaps[_K], TWorldEvent<_K>>;
            get_world(name: string): IBoundWorld<any, string | symbol>;
            delete_world(target: TWorldName | IBoundWorld<any, any> | (string & {})): boolean;
            match(flag: Uint32Array, req: Uint32Array): boolean;
        }
    }

    export const ecs: ecs_types.IPtsEcs;
}
