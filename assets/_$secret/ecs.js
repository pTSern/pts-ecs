// Core Zero-GC Bitmask ECS Runtime Plugin (pts-ecs)
// Pure zero-dependency JS — attaches singleton runtime to globalThis.pTS.ecs.
(function (root) {
    "use strict";

    root.pTS = root.pTS || {};
    var _schema = (root.pTS.__ecs_schema__ = root.pTS.__ecs_schema__ || {
        components: Object.create(null),
        worlds: Object.create(null),
    });
    if (!_schema.components) _schema.components = Object.create(null);
    if (!_schema.worlds) _schema.worlds = Object.create(null);

    var _$CORE_TAG = Symbol.for("__pts_ecs_core__");
    if (root.pTS.ecs && root.pTS.ecs[_$CORE_TAG]) {
        if (typeof _schema._sync === "function") {
            _schema._sync();
        }
        return;
    }

    var _$DEFAULT_CAPACITY = 256;
    var _$worlds = Object.create(null); // keyed strictly by world.name

    function _$create_map() {
        return Object.create(null);
    }

    function _$clone_template(template) {
        if (typeof template === "function") {
            return template();
        }
        function _clone_val(val) {
            if (val === null || typeof val !== "object") return val;
            if (Array.isArray(val)) return val.map(_clone_val);
            if (val instanceof Set) {
                var _s = new Set();
                val.forEach(function (item) { _s.add(_clone_val(item)); });
                return _s;
            }
            if (val instanceof Map) {
                var _m = new Map();
                val.forEach(function (v, k) { _m.set(k, _clone_val(v)); });
                return _m;
            }
            if (ArrayBuffer.isView(val)) {
                return new val.constructor(val);
            }
            var _proto = Object.getPrototypeOf(val);
            if (_proto !== Object.prototype && _proto !== null) {
                return typeof val.clone === "function"
                    ? val.clone()
                    : Object.assign(Object.create(_proto), val);
            }
            var _out = {};
            var _keys = Object.keys(val);
            for (var _i = 0; _i < _keys.length; _i++) {
                var _k = _keys[_i];
                _out[_k] = _clone_val(val[_k]);
            }
            return _out;
        }
        return _clone_val(template);
    }

    function _$get_holder(world) {
        var _holder = world && world.name ? _$worlds[world.name] : null;
        if (!_holder || _holder.world !== world) {
            throw new Error("[pts-ecs] World not found or already deleted: \"" + (world ? world.name : "") + "\"");
        }
        return _holder;
    }

    function _$ensure_capacity(holder, id) {
        if (id < holder.capacity) return;

        var _new_cap = holder.capacity;
        while (_new_cap <= id) {
            _new_cap <<= 1;
        }
        if (holder.max_entities !== Infinity && _new_cap > holder.max_entities) {
            _new_cap = holder.max_entities;
        }

        var _new_masks = new Uint32Array(_new_cap * holder.word_count);
        _new_masks.set(holder.masks);
        holder.masks = _new_masks;
        holder.world.masks = _new_masks;

        var _new_idx_map = new Int32Array(_new_cap);
        _new_idx_map.fill(-1);
        _new_idx_map.set(holder.id_to_active_idx);
        holder.id_to_active_idx = _new_idx_map;

        holder.capacity = _new_cap;
    }

    function _$is_alive(holder, id) {
        return id >= 0 && id < holder.capacity && holder.id_to_active_idx[id] !== -1;
    }

    function _$is_valid_bit(bit, max) {
        return (bit >>> 0) === bit && bit < max;
    }

    function _$build_mask(holder, bits) {
        var _out = new Uint32Array(holder.word_count);
        for (var _i = 0; _i < bits.length; _i++) {
            var _bit = bits[_i];
            if (!_$is_valid_bit(_bit, holder.stores.length)) {
                throw new Error("[pts-ecs] Invalid or unregistered component bit in world \"" + holder.name + "\": " + String(_bit));
            }
            _out[_bit >>> 5] |= (1 << (_bit & 31)) >>> 0;
        }
        return _out;
    }

    function _$query_mask(holder, bits) {
        var _mask = holder.query_masks.get(bits);
        if (!_mask) {
            _mask = _$build_mask(holder, bits);
            holder.query_masks.set(bits, _mask);
        }
        return _mask;
    }

    // ─── Internal Component Operations ───
    function _$comp_add(world, id, bit, prop) {
        var _holder = _$get_holder(world);
        if (!_$is_alive(_holder, id)) throw new Error("[pts-ecs] Entity not found: " + id);
        if (!_$is_valid_bit(bit, _holder.templates.length)) {
            throw new Error("[pts-ecs] Component bit not registered in world \"" + _holder.name + "\": " + String(bit));
        }

        var _word = bit >>> 5;
        var _bit_mask = (1 << (bit & 31)) >>> 0;
        var _mask_idx = id * _holder.word_count + _word;

        if ((_holder.masks[_mask_idx] & _bit_mask) !== 0) {
            return _holder.stores[bit][id];
        }

        var _instance = prop !== undefined ? prop : _$clone_template(_holder.templates[bit]);
        _holder.masks[_mask_idx] |= _bit_mask;
        _holder.stores[bit][id] = _instance;
        return _instance;
    }

    function _$comp_get(world, id, bit, default_prop) {
        var _holder = _$get_holder(world);
        if (!_$is_alive(_holder, id)) return undefined;
        if (!_$is_valid_bit(bit, _holder.stores.length)) {
            throw new Error("[pts-ecs] Component bit not registered in world \"" + _holder.name + "\": " + String(bit));
        }

        var _word = bit >>> 5;
        var _bit_mask = (1 << (bit & 31)) >>> 0;
        if ((_holder.masks[id * _holder.word_count + _word] & _bit_mask) === 0) {
            if (default_prop !== undefined) {
                return _$comp_add(world, id, bit, default_prop);
            }
            return undefined;
        }
        return _holder.stores[bit][id];
    }

    function _$comp_has(world, id, bit) {
        var _holder = _$get_holder(world);
        if (!_$is_alive(_holder, id)) return false;
        if (!_$is_valid_bit(bit, _holder.stores.length)) return false;

        var _word = bit >>> 5;
        var _bit_mask = (1 << (bit & 31)) >>> 0;
        return (_holder.masks[id * _holder.word_count + _word] & _bit_mask) !== 0;
    }

    function _$comp_remove(world, id, bit) {
        var _holder = _$get_holder(world);
        if (!_$is_alive(_holder, id)) return false;
        if (!_$is_valid_bit(bit, _holder.stores.length)) return false;

        var _word = bit >>> 5;
        var _bit_mask = (1 << (bit & 31)) >>> 0;
        var _mask_idx = id * _holder.word_count + _word;
        if ((_holder.masks[_mask_idx] & _bit_mask) === 0) return false;

        _holder.masks[_mask_idx] &= ~_bit_mask;
        _holder.stores[bit][id] = undefined;
        return true;
    }

    // ─── Internal Entity Operations ───
    function _$entity_add(world, args, startIdx) {
        var _holder = _$get_holder(world);
        if (_holder.active_ids.length >= _holder.max_entities) {
            console.warn(
                "[pts-ecs] World \"" + _holder.name +
                "\" reached max_entities (" + _holder.max_entities + "). Returning -1."
            );
            return -1;
        }

        var _id = _holder.free_ids.length > 0 ? _holder.free_ids.pop() : _holder.count++;
        _$ensure_capacity(_holder, _id);

        var _active_idx = _holder.active_ids.length;
        _holder.active_ids.push(_id);
        _holder.id_to_active_idx[_id] = _active_idx;
        world.entities.add(_id);

        var _base = _id * _holder.word_count;
        for (var _i = startIdx; _i < args.length; _i++) {
            var _bit = args[_i];
            if (!_$is_valid_bit(_bit, _holder.templates.length)) {
                throw new Error("[pts-ecs] Component bit not registered in world \"" + _holder.name + "\": " + String(_bit));
            }

            var _word = _bit >>> 5;
            var _bit_mask = (1 << (_bit & 31)) >>> 0;
            var _mask_idx = _base + _word;
            if ((_holder.masks[_mask_idx] & _bit_mask) !== 0) continue;

            _holder.masks[_mask_idx] |= _bit_mask;
            _holder.stores[_bit][_id] = _$clone_template(_holder.templates[_bit]);
        }

        return _id;
    }

    function _$entity_flag(world, id) {
        var _holder = _$get_holder(world);
        if (!_$is_alive(_holder, id)) throw new Error("[pts-ecs] Entity not found: " + id);

        var _start = id * _holder.word_count;
        return _holder.masks.subarray(_start, _start + _holder.word_count);
    }

    function _$entity_has_all(world, id, mask) {
        var _holder = _$get_holder(world);
        if (!_$is_alive(_holder, id)) return false;

        var _wc = _holder.word_count;
        var _masks = _holder.masks;
        if (_wc === 1) {
            return (_masks[id] & mask[0]) === mask[0];
        }
        var _base = id * _wc;
        for (var _w = 0; _w < _wc; _w++) {
            var _req = mask[_w];
            if ((_masks[_base + _w] & _req) !== _req) return false;
        }
        return true;
    }

    function _$entity_has_any(world, id, mask) {
        var _holder = _$get_holder(world);
        if (!_$is_alive(_holder, id)) return false;

        var _wc = _holder.word_count;
        var _masks = _holder.masks;
        if (_wc === 1) {
            return (_masks[id] & mask[0]) !== 0;
        }
        var _base = id * _wc;
        for (var _w = 0; _w < _wc; _w++) {
            if ((_masks[_base + _w] & mask[_w]) !== 0) return true;
        }
        return false;
    }

    function _$entity_remove(world, id) {
        var _holder = _$get_holder(world);
        if (!_$is_alive(_holder, id)) return;

        var _wc = _holder.word_count;
        var _base = id * _wc;
        var _masks = _holder.masks;

        for (var _w = 0; _w < _wc; _w++) {
            var _word_val = _masks[_base + _w];
            while (_word_val !== 0) {
                var _lsb = _word_val & -_word_val;
                var _bit_in_word = 31 - Math.clz32(_lsb);
                var _comp_idx = (_w << 5) + _bit_in_word;
                if (_comp_idx < _holder.stores.length) {
                    _holder.stores[_comp_idx][id] = undefined;
                }
                _word_val ^= _lsb;
            }
            _masks[_base + _w] = 0;
        }

        var _remove_idx = _holder.id_to_active_idx[id];
        var _last_idx = _holder.active_ids.length - 1;
        if (_remove_idx !== _last_idx) {
            var _last_id = _holder.active_ids[_last_idx];
            _holder.active_ids[_remove_idx] = _last_id;
            _holder.id_to_active_idx[_last_id] = _remove_idx;
        }
        _holder.active_ids.pop();
        _holder.id_to_active_idx[id] = -1;
        _holder.free_ids.push(id);
        world.entities.delete(id);
    }

    // ─── Internal Event Operations (Zero-GC Int32Array Channels) ───
    function _$event_push(world, channel, a, b) {
        if (b === undefined) b = -1;
        var _holder = _$get_holder(world);
        var _ch = _holder.events.get(channel);
        if (!_ch) {
            _ch = { count: 0, cap: 64, a: new Int32Array(64), b: new Int32Array(64) };
            _holder.events.set(channel, _ch);
        } else if (_ch.count >= _ch.cap) {
            var _new_cap = _ch.cap << 1;
            var _na = new Int32Array(_new_cap);
            var _nb = new Int32Array(_new_cap);
            _na.set(_ch.a);
            _nb.set(_ch.b);
            _ch.a = _na;
            _ch.b = _nb;
            _ch.cap = _new_cap;
        }
        var _idx = _ch.count++;
        _ch.a[_idx] = a;
        _ch.b[_idx] = b;
    }

    function _$event_flush(world, channel, handler) {
        var _holder = _$get_holder(world);
        var _ch = _holder.events.get(channel);
        if (!_ch || _ch.count === 0) return 0;

        var _count = _ch.count;
        var _a = _ch.a;
        var _b = _ch.b;
        _ch.count = 0;

        for (var _i = 0; _i < _count; _i++) {
            handler(_a[_i], _b[_i]);
        }
        return _count;
    }

    function _$event_clear(world, channel) {
        var _holder = _$get_holder(world);
        if (channel !== undefined) {
            var _ch = _holder.events.get(channel);
            if (_ch) _ch.count = 0;
            return;
        }
        _holder.events.forEach(function (_ch) {
            _ch.count = 0;
        });
    }

    // ─── Mask, Match & Query ───
    function _$match(flag, req) {
        var _len = req.length;
        if (_len === 1) {
            return (flag[0] & req[0]) === req[0];
        }
        for (var _w = 0; _w < _len; _w++) {
            var _r = req[_w];
            if ((flag[_w] & _r) !== _r) return false;
        }
        return true;
    }

    function _$query(world, bits, callback) {
        var _holder = _$get_holder(world);
        var _wc = _holder.word_count;
        var _req = _$query_mask(_holder, bits);
        var _masks = _holder.masks;
        var _stores = _holder.stores;
        var _active = _holder.active_ids;
        var _bit_count = bits.length;

        var _s0 = _bit_count > 0 ? _stores[bits[0]] : null;
        var _s1 = _bit_count > 1 ? _stores[bits[1]] : null;
        var _s2 = _bit_count > 2 ? _stores[bits[2]] : null;
        var _s3 = _bit_count > 3 ? _stores[bits[3]] : null;

        for (var _i = 0, _n = _active.length; _i < _n; _i++) {
            var _id = _active[_i];

            if (_wc === 1) {
                var _r0 = _req[0];
                if ((_masks[_id] & _r0) !== _r0) continue;
            } else {
                var _base = _id * _wc;
                var _ok = true;
                for (var _w = 0; _w < _wc; _w++) {
                    var _r = _req[_w];
                    if ((_masks[_base + _w] & _r) !== _r) {
                        _ok = false;
                        break;
                    }
                }
                if (!_ok) continue;
            }

            switch (_bit_count) {
                case 0: callback(_id); break;
                case 1: callback(_id, _s0[_id]); break;
                case 2: callback(_id, _s0[_id], _s1[_id]); break;
                case 3: callback(_id, _s0[_id], _s1[_id], _s2[_id]); break;
                case 4: callback(_id, _s0[_id], _s1[_id], _s2[_id], _s3[_id]); break;
                default: {
                    var _args = _holder.query_args;
                    _args.length = _bit_count + 1;
                    _args[0] = _id;
                    for (var _b = 0; _b < _bit_count; _b++) {
                        _args[_b + 1] = _stores[bits[_b]][_id];
                    }
                    callback.apply(null, _args);
                }
            }
        }
    }

    // ─── Spatial-Hash Collide (Zero-GC Buffers) ───
    var _$COL_HASH_SIZE = 4096
    var _$COL_HASH_MASK = _$COL_HASH_SIZE - 1;
    var _$COL_PRIME_X = 73856093;
    var _$COL_PRIME_Y = 19349663;

    var _$col_cap = 0;
    var _$col_ids = null;
    var _$col_cxs = null;
    var _$col_cys = null;
    var _$col_next = null;
    var _$col_dirty = null;
    var _$col_head = new Int32Array(_$COL_HASH_SIZE).fill(-1);

    function _$ensure_col_cap(min) {
        if (min <= _$col_cap) return;
        var _cap = Math.max(256, _$col_cap);
        while (_cap < min) _cap <<= 1;

        _$col_ids = new Int32Array(_cap);
        _$col_cxs = new Int32Array(_cap);
        _$col_cys = new Int32Array(_cap);
        _$col_next = new Int32Array(_cap);
        _$col_dirty = new Int32Array(_cap);
        _$col_cap = _cap;
    }

    function _$collide(world, pos_bit, col_bit, opts) {
        var _holder = _$get_holder(world);
        var _active = _holder.active_ids;
        var _active_len = _active.length;
        if (_active_len === 0) return;

        _$ensure_col_cap(_active_len);

        var _wc = _holder.word_count;
        var _masks = _holder.masks;
        if (!_$is_valid_bit(pos_bit, _holder.stores.length) || !_$is_valid_bit(col_bit, _holder.stores.length)) {
            throw new Error("[pts-ecs] collide() received invalid/unregistered bit in world \"" + _holder.name + "\": pos=" + String(pos_bit) + ", col=" + String(col_bit));
        }
        var _pos_store = _holder.stores[pos_bit];
        var _col_store = _holder.stores[col_bit];
        if (!_pos_store || !_col_store) return;

        var _pw = pos_bit >>> 5;
        var _pm = (1 << (pos_bit & 31)) >>> 0;
        var _cw = col_bit >>> 5;
        var _cm = (1 << (col_bit & 31)) >>> 0;
        var _same_word = _pw === _cw;
        var _both_mask = (_pm | _cm) >>> 0;

        var _ids = _$col_ids;
        var _target = opts ? opts.target : undefined;
        var _target_id = (_target && _target.id !== undefined) ? _target.id : -1;

        var _count = 0;
        var _max_r = 0;
        var _i, _id, _r;
        if (_wc === 1) {
            for (_i = 0; _i < _active_len; _i++) {
                _id = _active[_i];
                if (_id === _target_id) continue;
                if ((_masks[_id] & _both_mask) !== _both_mask) continue;
                _r = _col_store[_id].radius;
                if (_r <= 0) continue;
                if (_r > _max_r) _max_r = _r;
                _ids[_count++] = _id;
            }
        } else if (_same_word) {
            for (_i = 0; _i < _active_len; _i++) {
                _id = _active[_i];
                if (_id === _target_id) continue;
                if ((_masks[_id * _wc + _pw] & _both_mask) !== _both_mask) continue;
                _r = _col_store[_id].radius;
                if (_r <= 0) continue;
                if (_r > _max_r) _max_r = _r;
                _ids[_count++] = _id;
            }
        } else {
            for (_i = 0; _i < _active_len; _i++) {
                _id = _active[_i];
                if (_id === _target_id) continue;
                var _base = _id * _wc;
                if ((_masks[_base + _pw] & _pm) === 0 || (_masks[_base + _cw] & _cm) === 0) continue;
                _r = _col_store[_id].radius;
                if (_r <= 0) continue;
                if (_r > _max_r) _max_r = _r;
                _ids[_count++] = _id;
            }
        }

        if (_count === 0) return;

        // 3x3 neighbor search requires chunk_size >= 2 * max_radius so no overlapping pair can sit 2 cells apart
        var _chunk_size = Math.max(1, (opts && opts.chunk_size !== undefined) ? opts.chunk_size : 32);
        var _min_chunk = _max_r * 2;
        if (_chunk_size < _min_chunk) _chunk_size = _min_chunk;
        var _inv_chunk = 1 / _chunk_size;
        var _iterations = Math.max(1, (opts && opts.iterations !== undefined) ? opts.iterations : 2);
        var _on_collide = opts ? opts.on_collide : undefined;

        var _has_target = false;
        var _tx = 0, _ty = 0, _tr = 0;
        var _on_hit = undefined;
        if (_target) {
            if (_target_id >= 0 && _$is_alive(_holder, _target_id)) {
                var _tpos = _pos_store[_target_id];
                var _tcol = _col_store[_target_id];
                if (_tpos && _tcol) {
                    _tx = _tpos.x;
                    _ty = _tpos.y;
                    _tr = _tcol.radius;
                    _has_target = _tr > 0;
                    _on_hit = _target.on_hit;
                }
            } else if (_target.x !== undefined && _target.y !== undefined && _target.radius !== undefined) {
                _tx = _target.x;
                _ty = _target.y;
                _tr = _target.radius;
                _has_target = _tr > 0;
                _on_hit = _target.on_hit;
            }
        }

        var _head = _$col_head;
        var _next = _$col_next;
        var _cxs = _$col_cxs;
        var _cys = _$col_cys;
        var _dirty = _$col_dirty;
        var _dirty_count = 0;

        if (_count > 1) {
            for (var _iter = 0; _iter < _iterations; _iter++) {
                for (var _d = 0; _d < _dirty_count; _d++) {
                    _head[_dirty[_d]] = -1;
                }
                _dirty_count = 0;

                var _emit_hit = _iter === 0 && _on_hit !== undefined;

                for (_i = 0; _i < _count; _i++) {
                    _id = _ids[_i];
                    var _pos = _pos_store[_id];

                    if (_has_target) {
                        var _tdx = _pos.x - _tx;
                        var _tdy = _pos.y - _ty;
                        var _thit = _tr + _col_store[_id].radius;
                        var _tdsq = _tdx * _tdx + _tdy * _tdy;
                        if (_tdsq <= _thit * _thit) {
                            if (_tdsq > 0.0001) {
                                var _tdist = Math.sqrt(_tdsq);
                                var _tk = (_thit - _tdist) / _tdist;
                                _pos.x += _tdx * _tk;
                                _pos.y += _tdy * _tk;
                            } else {
                                _pos.x = _tx + _thit;
                            }
                            if (_emit_hit) _on_hit(_id, _target_id);
                        }
                    }

                    var _cx = Math.floor(_pos.x * _inv_chunk);
                    var _cy = Math.floor(_pos.y * _inv_chunk);
                    _cxs[_i] = _cx;
                    _cys[_i] = _cy;

                    var _h = (Math.imul(_cx, _$COL_PRIME_X) ^ Math.imul(_cy, _$COL_PRIME_Y)) & _$COL_HASH_MASK;
                    if (_head[_h] === -1) {
                        _dirty[_dirty_count++] = _h;
                    }
                    _next[_i] = _head[_h];
                    _head[_h] = _i;
                }

                var _emit = _iter === 0 && _on_collide !== undefined;

                for (_i = 0; _i < _count; _i++) {
                    var _id_i = _ids[_i];
                    var _pos_i = _pos_store[_id_i];
                    var _xi = _pos_i.x;
                    var _yi = _pos_i.y;
                    var _ri = _col_store[_id_i].radius;
                    var _icx = _cxs[_i];
                    var _icy = _cys[_i];
                    var _di_sq = _has_target ? ((_xi - _tx) * (_xi - _tx) + (_yi - _ty) * (_yi - _ty)) : 0;

                    for (var _ox = -1; _ox <= 1; _ox++) {
                        var _ncx = _icx + _ox;
                        for (var _oy = -1; _oy <= 1; _oy++) {
                            var _ncy = _icy + _oy;
                            var _j = _head[(Math.imul(_ncx, _$COL_PRIME_X) ^ Math.imul(_ncy, _$COL_PRIME_Y)) & _$COL_HASH_MASK];

                            while (_j !== -1) {
                                if (_j > _i && _cxs[_j] === _ncx && _cys[_j] === _ncy) {
                                    var _id_j = _ids[_j];
                                    var _pos_j = _pos_store[_id_j];
                                    var _dx = _xi - _pos_j.x;
                                    var _dy = _yi - _pos_j.y;
                                    var _min = _ri + _col_store[_id_j].radius;
                                    var _dsq = _dx * _dx + _dy * _dy;

                                    if (_dsq < _min * _min) {
                                        if (_emit) _on_collide(_id_i, _id_j);

                                        var _nx, _ny;
                                        if (_dsq > 0.0001) {
                                            var _dist = Math.sqrt(_dsq);
                                            var _k = (_min - _dist) / _dist;
                                            _nx = _dx * _k;
                                            _ny = _dy * _k;
                                        } else {
                                            var _a = ((_i + _j) * 2.399963) % 6.283185;
                                            _nx = Math.cos(_a) * _min;
                                            _ny = Math.sin(_a) * _min;
                                        }

                                        if (_has_target) {
                                            var _dj_sq = (_pos_j.x - _tx) * (_pos_j.x - _tx) + (_pos_j.y - _ty) * (_pos_j.y - _ty);
                                            var _wi = _di_sq < _dj_sq ? 0.2 : 0.8;
                                            var _wj = 1 - _wi;
                                            _xi += _nx * _wi;
                                            _yi += _ny * _wi;
                                            _pos_j.x -= _nx * _wj;
                                            _pos_j.y -= _ny * _wj;
                                        } else {
                                            var _hx = _nx * 0.5;
                                            var _hy = _ny * 0.5;
                                            _xi += _hx;
                                            _yi += _hy;
                                            _pos_j.x -= _hx;
                                            _pos_j.y -= _hy;
                                        }
                                    }
                                }
                                _j = _next[_j];
                            }
                        }
                    }

                    _pos_i.x = _xi;
                    _pos_i.y = _yi;
                }
            }

            for (var _dc = 0; _dc < _dirty_count; _dc++) {
                _head[_dirty[_dc]] = -1;
            }
        }

        if (_has_target) {
            var _emit_single = _count === 1 && _on_hit !== undefined;
            for (_i = 0; _i < _count; _i++) {
                _id = _ids[_i];
                var _fpos = _pos_store[_id];
                var _fdx = _fpos.x - _tx;
                var _fdy = _fpos.y - _ty;
                var _fhit = _tr + _col_store[_id].radius;
                var _fdsq = _fdx * _fdx + _fdy * _fdy;

                if (_fdsq < _fhit * _fhit) {
                    if (_fdsq > 0.0001) {
                        var _fdist = Math.sqrt(_fdsq);
                        var _fk = (_fhit - _fdist) / _fdist;
                        _fpos.x += _fdx * _fk;
                        _fpos.y += _fdy * _fk;
                    } else {
                        _fpos.x = _tx + _fhit;
                    }
                    if (_emit_single) _on_hit(_id, _target_id);
                }
            }
        }
    }

    // ─── World Lifecycle & Bound World Facade ───
    function _$reset_world(world) {
        var _holder = _$get_holder(world);
        _holder.masks.fill(0);
        _holder.id_to_active_idx.fill(-1);
        for (var _c = 0; _c < _holder.stores.length; _c++) {
            _holder.stores[_c].length = 0;
        }
        _holder.active_ids.length = 0;
        _holder.free_ids.length = 0;
        _holder.count = 0;
        world.entities.clear();
        _$event_clear(world);
    }

    function _$delete_world(target) {
        if (!target) return false;
        var _name = typeof target === "string" ? target : target.name;
        if (!_name) return false;
        var _holder = _$worlds[_name];
        if (!_holder) return false;
        if (typeof target !== "string" && _holder.world !== target) return false;
        delete _$worlds[_name];
        return true;
    }

    function _$attach_bound_facade(world) {
        world.entity = {
            add: function () { return _$entity_add(world, arguments, 0); },
            remove: function (id) { return _$entity_remove(world, id); },
            flag: function (id) { return _$entity_flag(world, id); },
            has_all: function (id, mask) { return _$entity_has_all(world, id, mask); },
            has_any: function (id, mask) { return _$entity_has_any(world, id, mask); },
            count: function () {
                var _h = _$worlds[world.name];
                return _h && _h.world === world ? _h.active_ids.length : 0;
            },
        };
        world.component = {
            add: function (id, bit, prop) { return _$comp_add(world, id, bit, prop); },
            get: function (id, bit, default_prop) { return _$comp_get(world, id, bit, default_prop); },
            has: function (id, bit) { return _$comp_has(world, id, bit); },
            remove: function (id, bit) { return _$comp_remove(world, id, bit); },
        };
        world.event = {
            push: function (channel, a, b) { return _$event_push(world, channel, a, b); },
            flush: function (channel, handler) { return _$event_flush(world, channel, handler); },
            clear: function (channel) { return _$event_clear(world, channel); },
        };
        world.mask = function () {
            var _bits = new Array(arguments.length);
            for (var _i = 0; _i < arguments.length; _i++) _bits[_i] = arguments[_i];
            return _$build_mask(_$get_holder(world), _bits);
        };
        world.match = _$match;
        world.query = function (bits, callback) { return _$query(world, bits, callback); };
        world.collide = function (pos_bit, col_bit, opts) { return _$collide(world, pos_bit, col_bit, opts); };
        world.reset = function () { _$reset_world(world); };
        world.destroy = function () { _$delete_world(world); };
        return world;
    }

    function _$create_world(args) {
        var _name = args && typeof args.name === "string" ? args.name.trim() : "";
        if (!_name) {
            throw new Error("[pts-ecs] create_world requires a non-empty world \"name\".");
        }
        if (_$worlds[_name]) {
            throw new Error("[pts-ecs] World \"" + _name + "\" already exists.");
        }

        var _comp_map = (args && args.components) || {};
        var _keys = Object.keys(_comp_map);
        var _comp_count = _keys.length;
        var _word_count = Math.max(1, (_comp_count + 31) >>> 5);

        var _raw_max = args && args.max_entities !== undefined ? args.max_entities : Infinity;
        var _max_entities = (_raw_max === Infinity || _raw_max === "Infinity" || _raw_max <= 0)
            ? Infinity
            : Math.floor(_raw_max);

        var _init_cap = args && args.capacity !== undefined
            ? Math.max(16, Math.floor(args.capacity))
            : (_max_entities !== Infinity ? Math.max(16, _max_entities) : _$DEFAULT_CAPACITY);
        if (_max_entities !== Infinity && _init_cap > _max_entities) {
            _init_cap = _max_entities;
        }

        var _masks = new Uint32Array(_init_cap * _word_count);
        var _id_to_active_idx = new Int32Array(_init_cap);
        _id_to_active_idx.fill(-1);

        var _bits = _$create_map();
        var _stores = new Array(_comp_count);
        var _templates = new Array(_comp_count);

        for (var _i = 0; _i < _comp_count; _i++) {
            var _key = _keys[_i];
            _bits[_key] = _i;
            _stores[_i] = [];
            _templates[_i] = _comp_map[_key];
        }

        var _world = {
            name: _name,
            entities: new Set(),
            masks: _masks,
            word_count: _word_count,
            max_entities: _max_entities,
            bits: _bits,
        };

        _$worlds[_name] = {
            name: _name,
            world: _world,
            word_count: _word_count,
            capacity: _init_cap,
            max_entities: _max_entities,
            count: 0,
            free_ids: [],
            active_ids: [],
            id_to_active_idx: _id_to_active_idx,
            masks: _masks,
            stores: _stores,
            templates: _templates,
            query_masks: new WeakMap(),
            query_args: [],
            events: new Map(),
        };

        return _$attach_bound_facade(_world);
    }

    function _$instantiate_schema_world(name) {
        var _def = _schema.worlds[name];
        if (!_def) {
            throw new Error("[pts-ecs] Registered world not found: \"" + name + "\"");
        }
        var _comp_factories = _$create_map();
        var _comp_names = _def.components || [];
        for (var _i = 0; _i < _comp_names.length; _i++) {
            var _cname = _comp_names[_i];
            var _factory = _schema.components[_cname];
            if (typeof _factory !== "function") {
                console.warn("[pts-ecs] Component factory \"" + _cname + "\" missing for world \"" + name + "\"; using empty object fallback.");
                _factory = function () { return {}; };
            }
            _comp_factories[_cname] = _factory;
        }
        return _$create_world({
            name: name,
            components: _comp_factories,
            max_entities: _def.max_entities,
        });
    }

    function _$get_world(name) {
        var _holder = _$worlds[name];
        if (_holder) return _holder.world;
        return _$instantiate_schema_world(name);
    }

    // Private schema sync hook (lives on internal __ecs_schema__, never exposed on public pTS.ecs!)
    function _$sync_schema() {
        var _world_names = Object.keys(_schema.worlds);
        for (var _i = 0; _i < _world_names.length; _i++) {
            var _wn = _world_names[_i];
            var _def = _schema.worlds[_wn];
            if (!_def || !_def.auto_boost || _$worlds[_wn]) continue;

            var _comps = _def.components || [];
            var _all_ready = true;
            for (var _j = 0; _j < _comps.length; _j++) {
                if (typeof _schema.components[_comps[_j]] !== "function") {
                    _all_ready = false;
                    break;
                }
            }
            if (_all_ready) {
                _$instantiate_schema_world(_wn);
            }
        }
    }
    _schema._sync = _$sync_schema;

    // ─── Minimal Public API `globalThis.pTS.ecs` ───
    var ecs = _$create_map();
    ecs.create_world = _$create_world;
    ecs.get_world = _$get_world;
    ecs.delete_world = _$delete_world;
    ecs.match = _$match;
    Object.defineProperty(ecs, _$CORE_TAG, { value: true, enumerable: false });

    root.pTS.ecs = ecs;

    // Flush any auto_boost worlds already registered before ecs.js loaded
    _$sync_schema();
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : (typeof self !== "undefined" ? self : this)));
