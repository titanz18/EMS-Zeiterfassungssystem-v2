export const STORAGE_KEY = 'ems-terminal.session.v1';
export const MODES = {
  standard: { title: 'Standard', fields: [['name', 'Name'], ['passport', 'Reisepassnummer']] },
  department: { title: 'Abteilungsarbeit', fields: [['name', 'Name'], ['passport', 'Reisepassnummer'], ['department', 'Abteilung']] },
  training: { title: 'In Ausbildung', fields: [['instructor', 'Ausbilder'], ['trainee', 'Küken']] },
  air: { title: 'Luftrettung', fields: [['pilot', 'Pilot'], ['pilotPassport', 'Reisepassnummer Pilot'], ['copilot', 'Co-Pilot'], ['copilotPassport', 'Reisepassnummer Co-Pilot']] },
};
const aliases = { '1': 'standard', '01': 'standard', standard: 'standard', default: 'standard', '2': 'department', '02': 'department', abteilungsarbeit: 'department', '3': 'training', '03': 'training', ausbildung: 'training', 'in ausbildung': 'training', '4': 'air', '04': 'air', luftrettung: 'air' };
export const nowTime = () => new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false });
export const parseTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;
export function freshState() { return { version: 1, profile: {}, records: {}, mode: null }; }
export function restoreState(raw) {
  const state = freshState();
  if (!raw) return state;
  const saved = JSON.parse(raw);
  if (!saved || saved.version !== 1) throw new Error('Unbekannter Speicherstand');
  for (const key of new Set(Object.values(MODES).flatMap(mode => mode.fields.map(([key]) => key)))) {
    if (typeof saved.profile?.[key] === 'string') state.profile[key] = cleanValue(saved.profile[key]);
  }
  for (const [key, mode] of Object.entries(MODES)) {
    const record = saved.records?.[key];
    if (!record || !parseTime(record.start) || !Number.isInteger(record.step) || record.step < 0 || record.step > mode.fields.length) continue;
    const values = {};
    for (const [field] of mode.fields) values[field] = typeof record.values?.[field] === 'string' ? cleanValue(record.values[field]) : '';
    const missing = mode.fields.findIndex(([field]) => !values[field]);
    const step = missing >= 0 ? Math.min(record.step, missing) : record.step;
    state.records[key] = { values, step, start: record.start, end: parseTime(record.end) || '' };
  }
  state.mode = Object.hasOwn(state.records, saved.mode) ? saved.mode : null;
  return state;
}
const cleanValue = value => value.replace(/[\r\n\t]/g, ' ').trim().slice(0, 120);
export function currentRecord(state) { return state.mode ? state.records[state.mode] : null; }
export function currentQuestion(state) {
  const record = currentRecord(state);
  if (!record) return { label: 'Welche Abteilung möchtest du öffnen?', placeholder: 'z. B. standard', hint: 'Abteilung oder 1–4 eingeben. /hilfe zeigt alle Befehle.' };
  const field = MODES[state.mode].fields[record.step];
  if (!field) return { label: record.end ? 'Dienst beendet. Wie geht es weiter?' : 'Eintrag vollständig. Dein nächster Befehl?', placeholder: record.end ? '/kopieren oder /neu' : '/austragen', hint: '/beginn HH:MM korrigiert die Startzeit, /end HH:MM die Endzeit. /bearbeiten ändert deine Daten.' };
  const saved = record.values[field[0]] || state.profile[field[0]] || '';
  return { label: `${field[1]}?`, placeholder: saved || field[1], hint: saved ? `Enter übernimmt „${saved}“. Oder neuen Wert eingeben.` : 'Wert eingeben und mit Enter bestätigen. /zurueck geht einen Schritt zurück.' };
}
export function outputText(state) {
  const r = currentRecord(state);
  if (!r) return '';
  const v = key => r.values[key] || '';
  const end = `Eingetragen um: ${r.start}\n\nAusgetragen um: ${r.end}`;
  const formats = {
    standard: `Name: ${v('name')}\nReisepassnummer: ${v('passport')}\n${end}`,
    department: `Name: ${v('name')}\n\nReisepassnummer: ${v('passport')}\n\nAbteilung: ${v('department')}\n\n${end}`,
    training: `### Ausbildung:\n\nAusbilder: ${v('instructor')}\nKüken: ${v('trainee')}\n${end}`,
    air: `Luftrettung:\n\nPilot: ${v('pilot')}\n\nReisepassnummer Pilot: ${v('pilotPassport')}\n\nCo-Pilot: ${v('copilot')}\n\nReisepassnummer Co-Pilot: ${v('copilotPassport')}\n\n${end}`,
  };
  return r.end ? `~~${formats[state.mode]}~~` : formats[state.mode];
}
export const HELP = 'Abteilung: standard · abteilungsarbeit · ausbildung · luftrettung (auch 1–4)\n/beginn 18:00   Startzeit korrigieren\n/end 20:30      Endzeit setzen/korrigieren & Text kopieren\n/austragen      Austragen & Discord-Text automatisch kopieren\n/eintragen      Austragen rückgängig machen\n/kopieren       Aktuellen Text kopieren\n/bearbeiten     Angaben erneut durchgehen\n/zurueck        Vorherige Frage\n/menue          Abteilung auswählen\n/neu            Neuer Dienst; persönliche Angaben behalten\n/leeren         Nur Terminalverlauf leeren\n/loeschen       Lokale Daten löschen (mit Bestätigung)';
export function submit(state, raw, time = nowTime()) {
  const input = raw.trim();
  const command = input.toLocaleLowerCase('de-DE');
  const reply = (text, type = 'info', action) => ({ text, type, action });
  if (command === '/hilfe' || command === 'help') return reply(HELP);
  if (command === '/leeren') return reply('Terminalverlauf geleert.', 'info', 'clear');
  if (command === '/loeschen' || command === '/löschen') return reply('Alle lokal gespeicherten Angaben und Dienste entfernen? Tippe /loeschen bestaetigen.');
  if (command === '/loeschen bestaetigen' || command === '/löschen bestätigen') {
    Object.assign(state, freshState());
    return reply('Lokale Daten gelöscht. Wähle eine Abteilung.', 'success', 'erase');
  }
  if (command === '/menue' || command === '/menü') { state.mode = null; return reply('Wähle eine Abteilung. Vorhandene Dienste bleiben erhalten.'); }
  const selected = aliases[command.replace(/^\//, '')];
  const active = currentRecord(state);
  if (selected && (input.startsWith('/') || !active || active.step >= MODES[state.mode].fields.length)) {
    state.mode = selected;
    if (state.records[selected]) return reply(`${MODES[selected].title} wieder geöffnet. Startzeit ${state.records[selected].start}.`, 'success');
    state.records[selected] = { values: {}, step: 0, start: time, end: '' };
    return reply(`${MODES[selected].title} geöffnet. Beginn ${time}. Bitte beantworte die folgenden Fragen.`, 'success');
  }
  const r = currentRecord(state);
  if (!r) return reply('Wähle zuerst: standard, abteilungsarbeit, ausbildung oder luftrettung.', 'error');
  const mode = MODES[state.mode];
  if (command === '/neu') {
    state.records[state.mode] = { values: {}, step: 0, start: time, end: '' };
    return reply(`Neuer Dienst: ${mode.title}. Beginn ${time}. Gespeicherte Angaben mit Enter übernehmen.`, 'success');
  }
  if (command.startsWith('/beginn')) {
    const match = input.match(/^\/beginn\s+(\d{2}:\d{2})$/i);
    if (!match || !parseTime(match[1])) return reply('Bitte /beginn HH:MM verwenden, z. B. /beginn 18:00 (00:00 bis 23:59).', 'error');
    r.start = match[1];
    return reply(`Eintragungszeit auf ${r.start} geändert und gespeichert.`, 'success');
  }
  if (/^\/end(?:\s|$)/i.test(input)) {
    const match = input.match(/^\/end\s+(\d{2}:\d{2})$/i);
    if (!match || !parseTime(match[1])) return reply('Bitte /end HH:MM verwenden, z. B. /end 20:30 (00:00 bis 23:59).', 'error');
    if (mode.fields.some(([key]) => !r.values[key])) return reply('Bitte zuerst alle Angaben vervollständigen.', 'error');
    r.end = match[1];
    return reply(`Austragungszeit auf ${r.end} gesetzt. Dein Discord-Text ist fertig.`, 'success', 'copy');
  }
  if (command === '/bearbeiten') { r.step = 0; return reply('Angaben bearbeiten. Enter übernimmt den bisherigen Wert.'); }
  if (command === '/zurueck' || command === '/zurück') { r.step = Math.max(0, r.step - 1); return reply('Vorherige Angabe bearbeiten.'); }
  if (command === '/eintragen') { r.end = ''; return reply('Austragen rückgängig gemacht. Die Startzeit bleibt bestehen.', 'success'); }
  if (command === '/austragen' || command === '/kopieren') {
    if (mode.fields.some(([key]) => !r.values[key])) return reply('Bitte zuerst alle Angaben vervollständigen.', 'error');
    if (command === '/kopieren') return reply('Text zum Kopieren bereit.', 'info', 'copy');
    if (r.end) return reply(`Bereits um ${r.end} ausgetragen. Dein Text wird erneut kopiert.`, 'info', 'copy');
    r.end = time;
    return reply(`Um ${r.end} ausgetragen. Dein Discord-Text ist fertig.`, 'success', 'copy');
  }
  if (input.startsWith('/')) return reply('Unbekannter Befehl. /hilfe zeigt dir alle Befehle.', 'error');
  const field = mode.fields[r.step];
  if (!field) return reply('Eintrag vollständig. Nutze /austragen, /kopieren oder /bearbeiten.');
  const value = cleanValue(input || r.values[field[0]] || state.profile[field[0]] || '');
  if (!value) return reply(`Bitte ${field[1]} eingeben.`, 'error');
  r.values[field[0]] = value;
  state.profile[field[0]] = value;
  r.step++;
  return reply(r.step === mode.fields.length ? 'Alle Angaben erfasst. Dein Eintrag ist bereit.' : `${field[1]} übernommen.`, 'success');
}
