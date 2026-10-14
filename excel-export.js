// ============================================
// BASPAR PLASTICS - Excel Export Module
// ============================================
window.exportExcel = async function() {
  if (!USER || !['supervisor','manager','admin'].includes(USER.role)) {
    if (typeof toast === 'function') toast('❌ فقط سرپرست می‌تواند گزارش Excel بگیرد', 'err');
    return;
  }
  if (typeof XLSX === 'undefined') { 
    if (typeof toast === 'function') toast('❌ xlsx لود نشده', 'err');
    return; 
  }
  if (typeof toast === 'function') toast('⏳ در حال ساخت گزارش...', 'ok');
  
  var wb = XLSX.utils.book_new();
  var sheetCount = 0;
  
  var fmtDate = function(iso){ if(!iso) return ''; try { var d = new Date(iso); if(isNaN(d.getTime())) return ''; return d.toLocaleDateString('en-GB'); } catch(e){ return ''; } };
  var fmtTime = function(iso){ if(!iso) return ''; try { var d = new Date(iso); if(isNaN(d.getTime())) return ''; return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); } catch(e){ return ''; } };
  var calcMin = function(a,b){ if(!a||!b) return 0; var d=(new Date(b)-new Date(a))/60000; return d>0?Math.round(d):0; };
  var fmtDur = function(m){ if(!m || m<=0) return '0'; m=Math.round(m); var h=Math.floor(m/60), r=m%60; if(h>0 && r>0) return h+'h '+r+'m'; if(h>0) return h+'h'; return r+'m'; };
  
  // ===== 1. REQUESTS =====
  try {
    var usersMap = {};
    try {
      var allUsers = await pb.collection('users').getFullList({ fields: 'id,fullName,email', requestKey: 'u_' + Date.now() });
      allUsers.forEach(function(u){ usersMap[u.id] = u.fullName || u.email || u.id; });
    } catch(e) {}
    
    var allParts = await pb.collection('repair_parts').getFullList({ requestKey: 'p_' + Date.now() });
    var partsByReq = {};
    allParts.forEach(function(p){ if(p.request) { if(!partsByReq[p.request]) partsByReq[p.request]=[]; partsByReq[p.request].push(p); } });
    
    var reqs = await pb.collection('repair_requests').getFullList({ sort: '-created', expand: 'line,machine,reportedBy,assignedTo,supervisor,receivedBy,mold', requestKey: 'r_' + Date.now() });
    
    var reqHeaders = ['Tag No','Reported Date','Reported Time','Line','Machine','Reported By','Priority','Description','Status','Technician','Started Date','Started Time','Finished Date','Finished Time','Repair Hours','Parts Used','Mold','DT Code','DT Code 1 (Manual)','DT Code 1 (System)','DT Code 2','DT Code 2 (Manual)','DT Code 2 (System)','Verified By','Verified Date','Verified Time'];
    
    var fmtParts = function(parts){ if(!parts||!parts.length) return ''; return parts.map(function(p){ return (p.partName||'—')+' x'+(p.quantity||0); }).join(' | '); };
    var getU = function(id){ if(!id) return ''; return usersMap[id] || id; };
    var calcH = function(r){ if(!r.startedAt || !r.finishedAt) return ''; var d1=new Date(r.startedAt).getTime(), d2=new Date(r.finishedAt).getTime(); if(isNaN(d1)||isNaN(d2)) return ''; var h=(d2-d1)/3600000; return h>=0?h.toFixed(2):''; };
    
    var reqRows = reqs.map(function(r){
      var machine = r.expand && r.expand.machine ? (r.expand.machine.code + ' - ' + r.expand.machine.name) : '';
      var line = r.expand && r.expand.line ? (r.expand.line.code + ' - ' + r.expand.line.nameFa) : '';
      var reporter = r.expand && r.expand.reportedBy ? r.expand.reportedBy.fullName : getU(r.reportedBy);
      var tech = r.expand && r.expand.assignedTo ? r.expand.assignedTo.fullName : getU(r.assignedTo);
      var verifier = r.expand && r.expand.supervisor ? r.expand.supervisor.fullName : getU(r.supervisor);
      var parts = partsByReq[r.id] || [];
      var moldStr = r.expand && r.expand.mold ? (r.expand.mold.code + ' - ' + r.expand.mold.name) : '';
      var regTime = r.reportedAt || r.created;
      return [r.tagNo||'', fmtDate(regTime), fmtTime(regTime), line, machine, reporter, r.priority||'', r.description||'', (typeof statusLabel === 'function' ? statusLabel(r.status) : r.status), tech, fmtDate(r.startedAt), fmtTime(r.startedAt), fmtDate(r.finishedAt), fmtTime(r.finishedAt), calcH(r), fmtParts(parts), moldStr, r.dtCode||'', fmtDur(r.dtCode1Duration), fmtDur(calcMin(r.startedAt,r.finishedAt)), r.dtCode2||'', fmtDur(r.dtCode2Duration), fmtDur(calcMin(r.finishedAt,r.deliveredAt)), verifier, fmtDate(r.verifiedAt), fmtTime(r.verifiedAt)];
    });
    
    var ws1 = XLSX.utils.aoa_to_sheet([reqHeaders].concat(reqRows));
    ws1['!cols'] = reqHeaders.map(function(){ return { wch: 16 }; });
    XLSX.utils.book_append_sheet(wb, ws1, 'Requests');
    sheetCount++;
    console.log('[EXCEL] ✅ Requests: ' + reqRows.length + ' rows');
    
    var partsHeaders = ['Tag No','Machine','Part Name','Register No','Quantity','Created At'];
    var partsRows = [];
    allParts.forEach(function(p){
      var r = reqs.find(function(x){ return x.id === p.request; });
      if (!r) return;
      var machine = r.expand && r.expand.machine ? r.expand.machine.name : '';
      partsRows.push([r.tagNo||'', machine, p.partName||'', p.registerNo||'0', p.quantity||0, p.created ? new Date(p.created).toLocaleString('en-GB') : '']);
    });
    var ws2 = XLSX.utils.aoa_to_sheet([partsHeaders].concat(partsRows));
    ws2['!cols'] = partsHeaders.map(function(){ return { wch: 18 }; });
    XLSX.utils.book_append_sheet(wb, ws2, 'Parts');
    sheetCount++;
    console.log('[EXCEL] ✅ Parts: ' + partsRows.length + ' rows');
    
    var logs = await pb.collection('audit_log').getFullList({ sort: '-created', requestKey: 'a_' + Date.now() });
    var auditHeaders = ['Date','Time','Action','Tag No','User','Role','Field','Old Value','New Value','Reason'];
    var auditRows = logs.map(function(l){
      var d = new Date(l.created);
      return [d.toLocaleDateString('en-GB'), d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}), l.action||'', l.requestTagNo||'', l.actorName||'', l.actorRole||'', l.field||'', (l.oldValue||'').substring(0,100), (l.newValue||'').substring(0,100), l.reason||''];
    });
    var ws3 = XLSX.utils.aoa_to_sheet([auditHeaders].concat(auditRows));
    ws3['!cols'] = auditHeaders.map(function(){ return { wch: 15 }; });
    XLSX.utils.book_append_sheet(wb, ws3, 'Audit Log');
    sheetCount++;
    console.log('[EXCEL] ✅ Audit: ' + auditRows.length + ' rows');
  } catch(e) { console.error('[EXCEL] Requests error:', e); }
  
  // ===== 2. PRODUCTION =====
  try {
    var prodData = await pb.collection('production_data').getFullList({ sort: '-date', requestKey: 'pr_' + Date.now() });
    console.log('[EXCEL] Production data:', prodData.length, 'records');
    
    var prodHeaders = ['Machine','Date','AV','Type','Shift A','Shift B','Shift C','Total Production','CT (Target)','Cav (Target)','CT (Actual)','Cav (Actual)'];
    var prodRows = [];
    
    if (prodData.length > 0) {
      var machinesMap = {};
      try {
        var allMach = await pb.collection('machines').getFullList({ requestKey: 'm_' + Date.now() });
        allMach.forEach(function(m){ machinesMap[m.id] = m.code + ' - ' + m.name; });
      } catch(e) { console.warn('Machines load error:', e); }
      
      prodData.forEach(function(r){
        var m = machinesMap[r.machine] || '';
        prodRows.push([m, r.date ? r.date.slice(0,10) : '', r.av||'', r.type||'', r.shiftA||0, r.shiftB||0, r.shiftC||0, r.totalProduction||0, r.ctTarget||0, r.cavTarget||0, r.ctActual||0, r.cavActual||0]);
      });
    } else {
      prodRows.push(['(داده‌ای ثبت نشده)','','','','','','','','','','','']);
    }
    
    var wsP = XLSX.utils.aoa_to_sheet([prodHeaders].concat(prodRows));
    wsP['!cols'] = prodHeaders.map(function(){ return { wch: 18 }; });
    XLSX.utils.book_append_sheet(wb, wsP, 'Production');
    sheetCount++;
    console.log('[EXCEL] ✅ Production: ' + prodData.length + ' rows');
  } catch(e) { console.error('[EXCEL] Production error:', e); }
  
  // ===== 3. QUALITY =====
  try {
    var qualData = await pb.collection('quality_data').getFullList({ sort: '-date', requestKey: 'qu_' + Date.now() });
    console.log('[EXCEL] Quality data:', qualData.length, 'records');
    
    var qualHeaders = ['Date','Month','Week','AV Code','Article Variant','Color','Shift','Profit Center','Hold Total','Destroyed Total','Defect Issue','Total Production PCs','Hold %','Destroyed (PPM)','Rejected Ratio'];
    var qualRows = [];
    
    if (qualData.length > 0) {
      qualData.forEach(function(r){
        qualRows.push([r.date ? r.date.slice(0,10) : '', r.month||'', r.weekNumber||'', r.avCode||'', r.articleVariant||'', r.color||'', r.shiftNumber||'', r.profitCenter||'', r.holdTotal||0, r.destroyedTotal||0, r.defectIssue||'', r.totalProductionPcs||0, r.holdPercent||0, r.destroyedPPM||0, r.rejectedRatio||0]);
      });
    } else {
      qualRows.push(['(داده‌ای ثبت نشده)','','','','','','','','','','','','','','']);
    }
    
    var wsQ = XLSX.utils.aoa_to_sheet([qualHeaders].concat(qualRows));
    wsQ['!cols'] = qualHeaders.map(function(){ return { wch: 18 }; });
    XLSX.utils.book_append_sheet(wb, wsQ, 'Quality');
    sheetCount++;
    console.log('[EXCEL] ✅ Quality: ' + qualData.length + ' rows');
  } catch(e) { console.error('[EXCEL] Quality error:', e); }
  
  // ===== 4. SUMMARY =====
  try {
    var allReqs2 = await pb.collection('repair_requests').getFullList({ requestKey: 'sr_' + Date.now() });
    var total = allReqs2.length;
    var openCount = allReqs2.filter(function(r){ return ['SUBMITTED','APPROVED','ASSIGNED','IN_PROGRESS'].indexOf(r.status) >= 0; }).length;
    var pendingCount = allReqs2.filter(function(r){ return r.status === 'SUPERVISOR_REVIEW'; }).length;
    var closedCount = allReqs2.filter(function(r){ return ['CLOSED','DELIVERED'].indexOf(r.status) >= 0; }).length;
    var durs = allReqs2.filter(function(r){ return r.startedAt && r.finishedAt; }).map(function(r){ return (new Date(r.finishedAt) - new Date(r.startedAt)) / 3600000; });
    var mttr = durs.length ? (durs.reduce(function(a,b){return a+b;},0) / durs.length) : 0;
    
    var kpiRows = [['Total Requests', total],['Open', openCount],['Pending Review', pendingCount],['Closed', closedCount],['MTTR (hours)', mttr.toFixed(2)],['Report Date', new Date().toLocaleString('en-GB')]];
    var ws4 = XLSX.utils.aoa_to_sheet([['KPI','Value']].concat(kpiRows));
    ws4['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws4, 'Summary');
    sheetCount++;
    console.log('[EXCEL] ✅ Summary');
  } catch(e) { console.error('[EXCEL] Summary error:', e); }
  
  var fileName = 'Baspar_Report_' + new Date().toISOString().slice(0,10) + '.xlsx';
  XLSX.writeFile(wb, fileName);
  console.log('[EXCEL] ✅ Saved: ' + fileName + ' with ' + sheetCount + ' sheets');
  if (typeof toast === 'function') toast('✅ گزارش با ' + sheetCount + ' شیت ساخته شد', 'ok');
};

console.log('[EXCEL] Module loaded');