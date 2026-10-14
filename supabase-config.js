// supabase-config.js
// این فایل یک لایه واسط (Shim) بین کد PocketBase قدیمی و Supabase جدید ایجاد می‌کند.

const SUPABASE_URL = 'https://afklvjfxyhnoutupcady.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o0dzBvlaOctdiMRBduRvYg_aRVZpzkN';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// تبدیل نام Collection به نام جدول در Supabase
function getTableName(collection) {
  const map = {
    'Lines': 'lines', 'machines': 'machines', 'molds': 'molds',
    'spare_parts': 'spare_parts', 'repair_requests': 'repair_requests',
    'repair_parts': 'repair_parts', 'audit_log': 'audit_log',
    'dt_codes_custom': 'dt_codes_custom', 'notifications': 'notifications',
    'production_data': 'production_data', 'quality_data': 'quality_data',
    'users': 'users_public'
  };
  return map[collection] || collection.toLowerCase();
}

// نگاشت expand به جدول مرتبط
const EXPAND_MAP = {
  'line': 'lines', 'machine': 'machines', 'mold': 'molds',
  'reportedBy': 'users_public', 'assignedTo': 'users_public',
  'supervisor': 'users_public', 'receivedBy': 'users_public'
};

// پر کردن خودکار expand
async function enrichWithExpand(items, expandFields) {
  if (!expandFields || !items.length) return items;
  const fields = expandFields.split(',').map(f => f.trim());
  
  for (const field of fields) {
    const tbl = EXPAND_MAP[field];
    if (!tbl) continue;
    
    const ids = [...new Set(items.map(item => item[field]).filter(Boolean))];
    if (!ids.length) continue;
    
    const { data, error } = await supabase.from(tbl).select('*').in('id', ids);
    if (error) continue;
    
    const map = {};
    (data || []).forEach(r => { map[r.id] = r; });
    
    items.forEach(item => {
      if (!item.expand) item.expand = {};
      item.expand[field] = map[item[field]] || null;
    });
  }
  return items;
}

// شبیه‌ساز PocketBase Client
const pb = {
  authStore: {
    get isValid() {
      return !!localStorage.getItem('sb-auth');
    },
    save(session) {
      localStorage.setItem('sb-auth', JSON.stringify(session));
    },
    clear() {
      supabase.auth.signOut();
      localStorage.removeItem('sb-auth');
    }
  },
  
  collection(name) {
    const table = getTableName(name);
    return {
      async getFullList(options = {}) {
        let query = supabase.from(table).select('*');
        if (options.sort) {
          const desc = options.sort.startsWith('-');
          const col = options.sort.replace(/^-/, '');
          query = query.order(col, { ascending: !desc });
        }
        const { data, error } = await query;
        if (error) throw error;
        const items = data || [];
        if (options.expand) await enrichWithExpand(items, options.expand);
        return items;
      },
      
      async getList(page = 1, perPage = 200, options = {}) {
        const start = (page - 1) * perPage;
        const end = start + perPage - 1;
        let query = supabase.from(table).select('*', { count: 'exact' }).range(start, end);
        if (options.sort) {
          const desc = options.sort.startsWith('-');
          const col = options.sort.replace(/^-/, '');
          query = query.order(col, { ascending: !desc });
        }
        const { data, error, count } = await query;
        if (error) throw error;
        const items = data || [];
        if (options.expand) await enrichWithExpand(items, options.expand);
        return { items, totalItems: count || 0, page, perPage };
      },
      
      async getOne(id) {
        const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
        if (error) throw error;
        return data;
      },
      
      async getFirstListItem(filter) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) throw error;
        if (!data || !data.length) throw new Error('Not found');
        return data[0];
      },
      
      async create(record) {
        const { data, error } = await supabase.from(table).insert(record).select().single();
        if (error) throw error;
        return data;
      },
      
      async update(id, record) {
        const { data, error } = await supabase.from(table).update(record).eq('id', id).select().single();
        if (error) throw error;
        return data;
      },
      
      async delete(id) {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
      },
      
      async authWithPassword(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const session = { access_token: data.session.access_token, user: data.user };
        pb.authStore.save(session);
        return {
          record: {
            id: data.user.id,
            email: data.user.email,
            fullName: data.user.user_metadata?.fullName,
            role: data.user.user_metadata?.role
          },
          token: data.session.access_token
        };
      },
      
      async authRefresh() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) throw new Error('Not authenticated');
        return {
          record: {
            id: user.id,
            email: user.email,
            fullName: user.user_metadata?.fullName,
            role: user.user_metadata?.role
          }
        };
      },
      
      subscribe(callback) {
        const channel = supabase
          .channel(`rt-${table}-${Date.now()}`)
          .on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
            callback({ action: payload.eventType, record: payload.new });
          })
          .subscribe();
        return channel;
      },
      
      unsubscribe(channel) {
        if (channel) supabase.removeChannel(channel);
      }
    };
  }
};

window.pb = pb;
window.supabase = supabase;
console.log('[Supabase Shim] Loaded successfully');