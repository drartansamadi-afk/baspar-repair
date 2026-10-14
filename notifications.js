
// ============ BASPAR: AV & Type Auto-populate ============
(function(){
    function setup(attempt){
        attempt = attempt || 0;
        if (attempt > 20) return;
        if (!window.AV_TYPE_DATA) { setTimeout(function(){setup(attempt+1);}, 500); return; }
        const molds = window.AV_TYPE_DATA.molds.map(m => m.name + ' - ' + m.code);
        const lines = window.AV_TYPE_DATA.lines.map(l => l.code + ' / ' + l.nameEn + ' / ' + l.nameFa);
        ['baspar-molds-list','baspar-lines-list'].forEach(id => {
            let dl = document.getElementById(id);
            if (!dl) { dl = document.createElement('datalist'); dl.id = id; document.body.appendChild(dl); }
        });
        document.getElementById('baspar-molds-list').innerHTML = molds.map(v => '<option value="'+v.replace(/"/g,'&quot;')+'">').join('');
        document.getElementById('baspar-lines-list').innerHTML = lines.map(v => '<option value="'+v.replace(/"/g,'&quot;')+'">').join('');
        let avN=0, tpN=0;
        document.querySelectorAll('input').forEach(el => {
            const ph = (el.placeholder||'').toLowerCase();
            if (ph.includes('keratin')||ph.includes('bottle')) { el.setAttribute('list','baspar-molds-list'); el.setAttribute('autocomplete','off'); avN++; }
            if (ph.includes('ebm')||ph.includes('/ im')||ph.includes('injection')) { el.setAttribute('list','baspar-lines-list'); el.setAttribute('autocomplete','off'); tpN++; }
        });
        console.log('[BASPAR] AV='+avN+' Type='+tpN);
        setTimeout(function(){setup(attempt+1);}, 2000);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){setup(0);});
    else setup(0);
})();
