import { chromium } from '@playwright/test';
const file = process.argv[2] || new URL("../Feind-Cockpit-A1.html", import.meta.url).pathname, mode = process.argv[3] || 'live';
const b = await chromium.launch(); const p = await b.newPage(); const errs=[];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await p.addInitScript(mode => {
  const U='https://app.notion.com/p/';
  let rows=[
   {"Priorität":"P0","Notiz":"n1","Zuständig (Rolle)":"Marketing & Event","Archiviert":"__NO__","Nr":"1","Quelle":"Cockpit","Cockpit-ID":"s1","Bereich":"Steuerung & Fristen","date:Fällig:start":"2026-10-02","Status":"offen","Beschluss":"","Aufgabe":"NOTION-TITEL s1","url":U+"3eb40f8bbabb8100b95edf623f827608"},
   {"Priorität":"P2","Zuständig (Rolle)":"Messeteam","Archiviert":"__NO__","Nr":"98","Hinweis":"[\"neu\"]","Cockpit-ID":"","Bereich":"Material & Packliste","Status":"offen","Aufgabe":"NUR-IN-NOTION Molton","url":U+"3eb40f8bbabb811683f7f2d17f8235d8"}];
  window.__calls=[]; window.__rows=()=>rows; window.__setRows=r=>{rows=r};
  const mcp={
    async callTool(server,tool,input){ window.__calls.push([tool,JSON.parse(JSON.stringify(input))]);
      if(tool==='notion-query-data-sources') return {payload:{results:JSON.parse(JSON.stringify(rows)),has_more:false}};
      if(tool==='notion-update-page'){ return {payload:{ok:true}}; }
      if(tool==='notion-create-pages'){ const pr=input.pages[0].properties; rows.push(Object.assign({Nr:String(200+rows.length),url:U+'3eb40f8bbabb8100b95edf62300000'+rows.length.toString().padStart(2,'0')},pr)); return {payload:{pages:[]}}; }
      throw {code:'bad_request'}; },
    watchTool(){ return ()=>{}; }, invalidate: async()=>{} };
  window.claude={ use: async name => (name==='mcp' && mode==='live') ? mcp : null };
}, mode);
await p.goto('file://' + file + '#infratech-aufgaben'); await p.waitForTimeout(2500);
const status = await p.locator('#it-notion').innerText().catch(()=> 'FEHLT');
console.log('Statuszeile:', status.replace(/\s+/g,' '));
const txt = await p.locator('#panels-infratech').textContent();
console.log('Notion-Titel überlagert:', txt.includes('NOTION-TITEL s1'), '| n-98 sichtbar:', txt.includes('NUR-IN-NOTION Molton'));
if (mode==='live') {
  // Statuswechsel s1 → erledigt
  await p.evaluate(()=>{ const d=document.querySelector('details.it-cat'); document.querySelectorAll('details.it-cat').forEach(x=>x.open=true); });
  await p.selectOption('#st-s1', 'done'); await p.waitForTimeout(800);
  const up = (await p.evaluate(()=>window.__calls)).filter(c=>c[0]==='notion-update-page');
  console.log('Update-Aufruf:', JSON.stringify(up));
  // Konflikt: Notion ändert s1 auf blockiert, Cockpit zeigt noch erledigt; Nutzer setzt in Arbeit
  await p.evaluate(()=>{ const r=window.__rows(); r[0].Status='blockiert'; });
  await p.selectOption('#st-s1', 'in_progress'); await p.waitForTimeout(800);
  const dlg = await p.locator('.modal').innerText().catch(()=> 'kein Dialog');
  console.log('Konfliktdialog:', dlg.replace(/\s+/g,' ').slice(0,200));
  await p.locator('.modal button', { hasText: 'Abbrechen' }).click().catch(()=>{}); await p.waitForTimeout(400);
  const up2 = (await p.evaluate(()=>window.__calls)).filter(c=>c[0]==='notion-update-page').length;
  console.log('Nach Abbruch keine zweite Schreibung:', up2===1, '| angezeigter Status:', await p.locator('#st-s1').inputValue());
  // Neue Aufgabe anlegen
  await p.locator('button', { hasText: 'Neue Aufgabe' }).first().click(); await p.waitForTimeout(300);
  await p.fill('#f_title','TEST neue Aufgabe'); await p.locator('.modal button', { hasText: 'Anlegen' }).click(); await p.waitForTimeout(1200);
  const cr = (await p.evaluate(()=>window.__calls)).filter(c=>c[0]==='notion-create-pages');
  console.log('Create-Aufruf:', cr.length, JSON.stringify(cr[0] && cr[0][1].pages[0].properties));
  // Bearbeiten-Dialog: Titel gesperrt
  await p.evaluate(()=>{ document.querySelectorAll('details.it-cat').forEach(x=>x.open=true); });
}
console.log('Fehler:', errs.filter(e=>!/fonts\.g|ERR_|net::/.test(e)));
await b.close();
