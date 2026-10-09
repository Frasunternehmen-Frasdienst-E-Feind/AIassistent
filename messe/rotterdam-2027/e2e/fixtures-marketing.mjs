// Beispieldaten für Marketing-Tests: nur erfundene Organisationen und Orte (keine Personen, keine echten Kontakte).
export function marketingSeed(today = '2026-10-07') {
  const d = n => { const x = new Date(today + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const db = {};
  const content = [
    ['Baustellenbericht Fräsen A13', 'linkedin', 'entwurf', 3, -20, 'Autobahn'], ['Referenz Ortsdurchfahrt', 'website', 'review', 5, -4, 'Innerorts'],
    ['Newsletter Oktober', 'newsletter', 'freigegeben', 9, -2, 'Allgemein'], ['Messeteaser InfraTech', 'linkedin', 'idee', 20, -1, 'Messe'],
    ['Video Schleiftechnik', 'website', 'veroeffentlicht', -6, -6, 'Messe'], ['Fallstudie Radweg', 'referenzbericht', 'entwurf', 14, -3, 'Radweg']
  ];
  content.forEach(([title, channel, status, plan, since, projectType], i) => { db['content/c' + i] = { title, channel, status, plannedDate: d(plan), statusSince: d(since), projectType, region: 'Brandenburg' }; });
  const leads = [
    ['Gemeinde Musterstadt', 'kommune', 'website', 'neu', -2, -2, 'Brandenburg', 'Dahme-Spreewald'],
    ['Bau GmbH Beispiel', 'bauunternehmen', 'messe', 'qualifiziert', -9, -9, 'Brandenburg', 'Spree-Neiße'],
    ['Ingenieurbüro Muster', 'ingenieurbuero', 'empfehlung', 'angebot', -15, -12, 'Sachsen', 'Görlitz'],
    ['Straßenbauamt Probe', 'behoerde', 'ausschreibung', 'verhandlung', -25, -20, 'Mecklenburg-Vorpommern', 'Ludwigslust-Parchim'],
    ['Tiefbau AG Beispiel', 'bauunternehmen', 'linkedin', 'gewonnen', -30, -5, 'Brandenburg', 'Oberspreewald-Lausitz'],
    ['Stadt Probestadt', 'kommune', 'telefon', 'neu', -1, -1, 'Brandenburg', 'Dahme-Spreewald'],
    ['Amt Beispielland', 'behoerde', 'website', 'qualifiziert', -18, -18, 'Sachsen', 'Bautzen'],
    ['Wegebau KG Muster', 'bauunternehmen', 'messe', 'verloren', -28, -26, 'Berlin', '']
  ];
  leads.forEach(([organisation, orgType, channel, stage, created, last, region, landkreis], i) => { db['mkt_leads/l' + i] = { organisation, orgType, channel, stage, createdAt: d(created), lastContact: d(last), region, landkreis, service: 'Fräsen' }; });
  const tenders = [['Leipzig', 'Sachsen', 'Leipzig', 4], ['Cottbus', 'Brandenburg', 'Cottbus', 12], ['Potsdam', 'Brandenburg', 'Potsdam', 30], ['Rostock', 'Mecklenburg-Vorpommern', 'Rostock', -3], ['Dresden', 'Sachsen', 'Dresden', 45]];
  tenders.forEach(([ort, region, landkreis, dl], i) => { db['tenders/t' + i] = { title: 'Fahrbahnerneuerung ' + ort, region, ort, landkreis, deadline: d(dl), status: 'neu', fit: i % 2 ? 'pruefen' : 'passt' }; });
  db['events/e1'] = { title: 'Tag der offenen Baustelle', date: d(18), endDate: d(18), type: 'kundenevent', location: 'Lübben', checklist: [{ area: 'sicherheit', item: 'Absperrung', done: true }, { area: 'marketing', item: 'Einladung', done: false }, { area: 'logistik', item: 'Parkplätze', done: true }] };
  const kws = [['fräsen brandenburg', 2, 4], ['asphalt fräsen', 7, 6], ['straßenfräsen', 12, 15], ['fräsdienst', 1, 1], ['kaltfräse mieten', 34, 40], ['fahrbahn sanieren', 18, null]];
  kws.forEach(([keyword, position, previousPosition], i) => { db['seo_keywords/k' + i] = { keyword, position, previousPosition, clicks: 40 - i * 5, impressions: 900 - i * 100, checkedAt: d(-2), region: 'Brandenburg', url: '/leistungen' }; });
  ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09'].forEach((m, i) => { db['seo_traffic/' + m] = { month: m, clicks: 300 + i * 40, impressions: 9000 + i * 500, ctr: 0.033 + i * 0.002, avgPosition: 14 - i }; });
  db['briefings/' + today] = { date: today, generatedBy: 'copilot', summary: 'Zwei Leads warten auf Rückmeldung. Eine Ausschreibung endet in vier Tagen. Der Newsletter ist freigegeben. Für die Messe fehlt noch der Teaser. Die SEO-Position für „fräsen brandenburg“ hat sich verbessert.',
    items: [{ severity: 'kritisch', text: 'Ausschreibung Leipzig endet in 4 Tagen', module: 'Ausschreibungen' }, { severity: 'info', text: 'Newsletter freigegeben', module: 'Content' }],
    weekPlan: [{ day: 'Mo', task: 'Angebot Leipzig', module: 'Ausschreibungen' }, { day: 'Mi', task: 'Teaser Messe', module: 'Content' }, { day: 'Fr', task: 'Follow-up Leads', module: 'Leads' }] };
  return db;
}
