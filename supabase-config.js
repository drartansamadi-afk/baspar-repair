// ============================================================
// Supabase Configuration & PocketBase Shim
// ============================================================

var SUPABASE_URL = 'https://afklvjfxyhnoutupcady.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_o0dzBvlaOctdiMRBduRvYg_aRVZpzkN';

var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabase;

// ====== نگاشت جداول ======
function getTableName(collection) {
  var map = {
    'Lines': 'lines', 'machines': 'machines', 'molds': 'molds',
    'spare_parts': 'spare_parts', 'repair_requests': 'repair_requests',
    'repair_parts': 'repair_parts', 'audit_log': 'audit_log',
    'dt_codes_custom': 'dt_codes_custom', 'notifications': 'notifications',
    'production_data': 'production_data', 'quality_data': 'quality_data',
    'users': 'users_public'
  };
  return map[collection] || collection.toLowerCase();
}

var EXPAND_MAP = {
  'line': 'lines', 'machine': 'machines', 'mold': 'molds',
  'reportedBy': 'users_public', 'assignedTo': 'users_public',
  'supervisor': 'users_public', 'receivedBy': 'users_public'
};

async function enrichWithExpand(items, expandFields) {
  if (!expandFields || !items.length) return items;
  var fields = expandFields.split(',').map(function(f){ return f.trim(); });
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    var tbl = EXPAND_MAP[field];
    if (!tbl) continue;
    var ids = [];
    var seen = {};
    items.forEach(function(item){
      var v = item[field];
      if (v && !seen[v]) { seen[v] = true; ids.push(v); }
    });
    if (!ids.length) continue;
    var res = await supabase.from(tbl).select('*').in('id', ids);
    if (res.error) continue;
    var map = {};
    (res.data || []).forEach(function(r){ map[r.id] = r; });
    items.forEach(function(item){
      if (!item.expand) item.expand = {};
      item.expand[field] = map[item[field]] || null;
    });
  }
  return items;
}

// ====== PocketBase Shim ======
var pb = {
  authStore: {
    get isValid() {
      return !!localStorage.getItem('sb-auth');
    },
    save: function(session) {
      localStorage.setItem('sb-auth', JSON.stringify(session));
    },
    clear: function() {
      supabase.auth.signOut();
      localStorage.removeItem('sb-auth');
    }
  },

  collection: function(name) {
    var table = getTableName(name);
    return {
      getFullList: async function(options) {
        options = options || {};
        var query = supabase.from(table).select('*');
        if (options.sort) {
          var desc = options.sort.charAt(0) === '-';
          var col = options.sort.replace(/^-/, '');
          query = query.order(col, { ascending: !desc });
        }
        var result = await query;
        if (result.error) throw result.error;
        var items = result.data || [];
        if (options.expand) await enrichWithExpand(items, options.expand);
        return items;
      },

      getList: async function(page, perPage, options) {
        page = page || 1;
        perPage = perPage || 200;
        options = options || {};
        var start = (page - 1) * perPage;
        var end = start + perPage - 1;
        var query = supabase.from(table).select('*', { count: 'exact' }).range(start, end);
        if (options.sort) {
          var desc = options.sort.charAt(0) === '-';
          var col = options.sort.replace(/^-/, '');
          query = query.order(col, { ascending: !desc });
        }
        var result = await query;
        if (result.error) throw result.error;
        var items = result.data || [];
        if (options.expand) await enrichWithExpand(items, options.expand);
        return { items: items, totalItems: result.count || 0, page: page, perPage: perPage };
      },

      getOne: async function(id) {
        var result = await supabase.from(table).select('*').eq('id', id).single();
        if (result.error) throw result.error;
        return result.data;
      },

      create: async function(record) {
        var result = await supabase.from(table).insert(record).select().single();
        if (result.error) throw result.error;
        return result.data;
      },

      update: async function(id, record) {
        var result = await supabase.from(table).update(record).eq('id', id).select().single();
        if (result.error) throw result.error;
        return result.data;
      },

      delete: async function(id) {
        var result = await supabase.from(table).delete().eq('id', id);
        if (result.error) throw result.error;
      },

      authWithPassword: async function(email, password) {
        var result = await supabase.auth.signInWithPassword({ email: email, password: password });
        if (result.error) throw result.error;
        var session = { access_token: result.data.session.access_token, user: result.data.user };
        pb.authStore.save(session);
        return {
          record: {
            id: result.data.user.id,
            email: result.data.user.email,
            fullName: (result.data.user.user_metadata || {}).fullName,
            role: (result.data.user.user_metadata || {}).role
          },
          token: result.data.session.access_token
        };
      },

      authRefresh: async function() {
        var result = await supabase.auth.getUser();
        if (result.error || !result.data.user) throw new Error('Not authenticated');
        var user = result.data.user;
        return {
          record: {
            id: user.id,
            email: user.email,
            fullName: (user.user_metadata || {}).fullName,
            role: (user.user_metadata || {}).role
          }
        };
      },

      subscribe: function(callback) {
        var channel = supabase.channel('rt-' + table + '-' + Date.now())
          .on('postgres_changes', { event: '*', schema: 'public', table: table }, function(payload){
            callback({ action: payload.eventType, record: payload.new });
          })
          .subscribe();
        return channel;
      },

      unsubscribe: function(channel) {
        if (channel) supabase.removeChannel(channel);
      }
    };
  }
};

// ====== اطمینان از گلوبال بودن pb و supabase ======
window.pb = pb;
window.supabase = supabase;

console.log('[Supabase Shim] Loaded. pb and supabase are global.');