/* supabase-config.js - Baspar Repair
 * Shim for pb compatibility layer over Supabase.
 * Only Publishable Key is used here (never service_role).
 */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://afklvjfxyhnoutupcady.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_o0dzBvlaOctdiMRBduRvYg_aRVZpzkN';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('[Supabase Shim] SDK not loaded. @supabase/supabase-js must load first.');
    return;
  }

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabaseClient = sb;
  window.sb = sb;

  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  var TABLE_MAP = {
    'Lines': 'lines',
    'lines': 'lines',
    'machines': 'machines',
    'molds': 'molds',
    'spare_parts': 'spare_parts',
    'repair_requests': 'repair_requests',
    'repair_parts': 'repair_parts',
    'audit_log': 'audit_log',
    'dt_codes_custom': 'dt_codes_custom',
    'notifications': 'notifications',
    'production_data': 'production_data',
    'quality_data': 'quality_data',
    'users': 'users_public',
    'users_public': 'users_public'
  };

  function getTableName(c) {
    if (!c) return c;
    var raw = String(c);
    if (TABLE_MAP[raw]) return TABLE_MAP[raw];
    var lower = raw.toLowerCase();
    if (TABLE_MAP[lower]) return TABLE_MAP[lower];
    return lower;
  }

  var EXPAND_MAP = {
    'line': 'lines',
    'machine': 'machines',
    'mold': 'molds',
    'reportedBy': 'users_public',
    'assignedTo': 'users_public',
    'supervisor': 'users_public',
    'receivedBy': 'users_public'
  };

  function nowISO() {
    return new Date().toISOString();
  }

  function genId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (e) {}
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function mapUser(u) {
    var meta = u.user_metadata || {};
    return {
      id: u.id,
      email: u.email,
      fullName: meta.fullName || meta.full_name || meta.name || u.email,
      role: meta.role || ''
    };
  }

  function ensureDefaults(table, rec) {
    var out = Object.assign({}, rec || {});
    var t = getTableName(table);

    if (!out.id) out.id = genId();

    if (t === 'repair_requests') {
      if (!out.created) out.created = nowISO();
      if (!out.tagNo) {
        var d = new Date();
        var ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
        out.tagNo = 'TAG-' + ymd + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      }
    }

    if (t === 'repair_parts' || t === 'audit_log') {
      if (!out.created) out.created = nowISO();
    }

    return out;
  }

  function applyFilter(q, filter) {
    if (!filter || !String(filter).trim()) return q;
    var re = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"([^"]*)"/g;
    var m;
    var found = false;
    while ((m = re.exec(String(filter))) !== null) {
      found = true;
      q = q.eq(m[1], m[2]);
    }
    if (!found) {
      console.warn('[Supabase Shim] Unsupported filter ignored:', filter);
    }
    return q;
  }

  function applySort(q, sort) {
    if (!sort || !String(sort).trim()) return q;
    var s = String(sort).trim();
    var desc = s.charAt(0) === '-';
    var col = s.replace(/^-/, '').trim();
    if (!col) return q;
    return q.order(col, { ascending: !desc });
  }

  async function enrich(items, fields) {
    if (!fields || !items || !items.length) return items;

    var flds = String(fields).split(',').map(function (f) {
      return f.trim();
    }).filter(Boolean);

    for (var i = 0; i < flds.length; i++) {
      var f = flds[i];
      var tbl = EXPAND_MAP[f];
      if (!tbl) continue;

      var ids = [];
      var seen = {};
      items.forEach(function (x) {
        var v = x[f];
        if (v && !seen[v]) {
          seen[v] = true;
          ids.push(v);
        }
      });

      if (!ids.length) continue;

      // For users_public, only UUIDs are valid. Skip legacy PocketBase IDs.
      if (tbl === 'users_public') {
        ids = ids.filter(function (v) {
          return UUID_RE.test(String(v));
        });
        if (!ids.length) {
          items.forEach(function (x) {
            if (x[f] && !x.expand) x.expand = {};
            if (x[f]) x.expand[f] = null;
          });
          continue;
        }
      }

      try {
        var r = await sb.from(tbl).select('*').in('id', ids);

        if (r.error) {
          console.warn('[Supabase Shim] expand error:', f, tbl, r.error.message);
          if (tbl === 'users_public') {
            items.forEach(function (x) {
              if (x[f]) {
                if (!x.expand) x.expand = {};
                x.expand[f] = null;
              }
            });
          }
          continue;
        }

        var map = {};
        (r.data || []).forEach(function (x) {
          map[x.id] = x;
        });

        items.forEach(function (x) {
          if (!x.expand) x.expand = {};
          x.expand[f] = map[x[f]] || null;
        });
      } catch (e) {
        console.warn('[Supabase Shim] expand exception:', f, tbl, e);
      }
    }

    return items;
  }

  var pb = {
    authStore: {
      get isValid() {
        try {
          return !!localStorage.getItem('sb-auth');
        } catch (e) {
          return false;
        }
      },
      save: function (s) {
        try {
          localStorage.setItem('sb-auth', JSON.stringify(s));
        } catch (e) {}
      },
      clear: function () {
        try {
          sb.auth.signOut();
        } catch (e) {}
        try {
          localStorage.removeItem('sb-auth');
        } catch (e) {}
      }
    },

    collection: function (name) {
      var t = getTableName(name);

      return {
        getFullList: async function (options) {
          options = options || {};
          var all = [];
          var pageSize = 1000;
          var from = 0;

          while (true) {
            var q = sb.from(t).select('*').range(from, from + pageSize - 1);
            q = applyFilter(q, options.filter);
            q = applySort(q, options.sort || 'id');

            var r = await q;
            if (r.error) throw r.error;

            var rows = r.data || [];
            all = all.concat(rows);

            if (rows.length < pageSize) break;
            from += pageSize;
            if (from > 200000) {
              console.warn('[Supabase Shim] getFullList stopped: too many records.');
              break;
            }
          }

          if (options.expand) await enrich(all, options.expand);
          return all;
        },

        getList: async function (page, perPage, options) {
          page = Number(page) || 1;
          perPage = Number(perPage) || 200;
          options = options || {};

          var start = (page - 1) * perPage;
          var end = start + perPage - 1;

          var q = sb.from(t)
            .select('*', { count: 'exact' })
            .range(start, end);

          q = applyFilter(q, options.filter);
          q = applySort(q, options.sort || 'id');

          var r = await q;
          if (r.error) throw r.error;

          var items = r.data || [];
          if (options.expand) await enrich(items, options.expand);

          return {
            items: items,
            totalItems: r.count || 0,
            page: page,
            perPage: perPage
          };
        },

        getFirstListItem: async function (filter, options) {
          options = options || {};
          var res = await this.getList(1, 1, Object.assign({}, options, { filter: filter }));
          if (!res.items.length) throw new Error('Record not found');
          return res.items[0];
        },

        getOne: async function (id) {
          var r = await sb.from(t).select('*').eq('id', id).single();
          if (r.error) throw r.error;
          return r.data;
        },

        create: async function (rec) {
          var payload = ensureDefaults(t, rec);
          var r = await sb.from(t).insert(payload).select().single();
          if (r.error) throw r.error;
          return r.data;
        },

        update: async function (id, rec) {
          var r = await sb.from(t).update(rec).eq('id', id).select().single();
          if (r.error) throw r.error;
          return r.data;
        },

        delete: async function (id) {
          var r = await sb.from(t).delete().eq('id', id);
          if (r.error) throw r.error;
        },

        authWithPassword: async function (email, password) {
          var r = await sb.auth.signInWithPassword({
            email: email,
            password: password
          });

          if (r.error) throw r.error;

          var u = r.data.user;
          var session = r.data.session;

          window.pb.authStore.save({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            user: u
          });

          return {
            record: mapUser(u),
            token: session.access_token
          };
        },

        authRefresh: async function () {
          var r = await sb.auth.getUser();
          if (r.error || !r.data.user) throw new Error('Not authenticated');
          return { record: mapUser(r.data.user) };
        },

        subscribe: function (cb) {
          var ch = sb.channel('rt-' + t + '-' + Date.now())
            .on('postgres_changes', {
              event: '*',
              schema: 'public',
              table: t
            }, function (payload) {
              cb({ action: payload.eventType, record: payload.new });
            })
            .subscribe();
          return ch;
        },

        unsubscribe: function (ch) {
          if (ch) sb.removeChannel(ch);
        }
      };
    }
  };

  window.pb = pb;
  window.supabase = sb;

  console.log('[Supabase Shim] Loaded. pb and supabase are global.');
})();