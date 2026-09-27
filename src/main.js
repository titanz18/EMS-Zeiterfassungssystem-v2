import './style.css';
import { STORAGE_KEY, MODES, freshState, restoreState, currentRecord, currentQuestion, outputText, submit, nowTime } from './session.js';

const $ = id => document.getElementById(id);
const input = $('command-input');
let state = freshState();
let storageError = '';
try { state = restoreState(localStorage.getItem(STORAGE_KEY)); }
catch { storageError = 'Speicher konnte nicht gelesen werden. Du kannst weiterarbeiten; prüfe deine Angaben.'; }
function storageStatus(message = '') {
  $('storage-warning').hidden = !message;
  $('storage-warning').textContent = message;
  $('storage-state').textContent = message ? 'Speichern eingeschränkt' : 'lokaler Browser';
}
storageStatus(storageError);
function save(erase = false) {
  try {
    if (erase) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageStatus();
  } catch { storageStatus('Dein Browser blockiert das Speichern. Änderungen bleiben nur bis zum Neuladen erhalten.'); }
}
function log(text, type = 'info') {
  const row = document.createElement('p');
  row.className = `line ${type}`;
  row.textContent = text;
  $('log').append(row);
  while ($('log').childElementCount > 50) $('log').firstElementChild.remove();
  $('log').scrollTop = $('log').scrollHeight;
}
function render() {
  const q = currentQuestion(state);
  const r = currentRecord(state);
  $('question').textContent = q.label;
  input.placeholder = q.placeholder;
  $('input-hint').textContent = q.hint;
  $('result').value = outputText(state);
  $('mode-label').textContent = state.mode ? `~/${MODES[state.mode].title.toLowerCase().replaceAll(' ', '-')}` : '~/abteilung';
  $('status').textContent = !r ? 'BEREIT' : r.end ? 'AUSGETRAGEN' : r.step < MODES[state.mode].fields.length ? 'EINGABE' : 'IM DIENST';
  $('status').className = r?.end ? 'ended' : '';
  $('file-label').textContent = state.mode ? `${state.mode}.txt` : 'eintrag.txt';
  $('copy').disabled = !r || MODES[state.mode].fields.some(([key]) => !r.values[key]);
}
async function copy() {
  try { await navigator.clipboard.writeText(outputText(state)); $('copy-status').textContent = 'In die Zwischenablage kopiert.'; input.focus(); }
  catch { $('result').focus(); $('result').select(); $('copy-status').textContent = 'Text markiert. Mit Strg+C oder dem Kopiermenü kopieren.'; }
}
async function run(raw) {
  log(`λ ${raw || '[Enter · gespeicherten Wert übernehmen]'}`, 'echo');
  const response = submit(state, raw);
  if (response.action === 'clear' || response.action === 'erase') $('log').replaceChildren();
  save(response.action === 'erase');
  log(response.text, response.type);
  $('copy-status').textContent = '';
  input.value = '';
  render();
  input.focus();
  if (response.action === 'copy') await copy();
}
$('command-form').addEventListener('submit', event => { event.preventDefault(); void run(input.value); });
document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.prefill) { input.value = `${button.dataset.command} `; input.focus(); return; }
  const command = button.dataset.command;
  void run(command.startsWith('/') ? command : `/${command}`);
}));
$('copy').addEventListener('click', copy);
// Esc returns focus to the prompt without stealing focus from text selection or buttons.
document.addEventListener('keydown', event => { if (event.key === 'Escape') { input.focus(); input.value = ''; } });
log(state.mode ? `${MODES[state.mode].title} wiederhergestellt. Beginn ${currentRecord(state).start}${currentRecord(state).end ? ` · Ende ${currentRecord(state).end}` : ''}.` : 'System bereit. Deine erste Eingabe: eine Abteilung.', 'success');
render();
const tick = () => { $('clock').textContent = nowTime(); };
tick(); setInterval(tick, 1000);
requestAnimationFrame(() => input.focus({ preventScroll: window.innerWidth > 800 }));
