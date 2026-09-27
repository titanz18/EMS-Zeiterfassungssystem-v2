import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, restoreState, submit, outputText, currentQuestion, MODES } from '../src/session.js';

test('checkout requests automatic copying only for valid complete entries', () => {
  for (const command of ['standard', 'abteilungsarbeit', 'ausbildung', 'luftrettung']) {
    const s = freshState();
    submit(s, command, '18:00');
    assert.equal(submit(s, '/austragen').action, undefined);
    assert.equal(submit(s, '/end 20:30').action, undefined);
    for (const [, label] of MODES[s.mode].fields) submit(s, `Test ${label}`);
    assert.equal(submit(s, '/austragen', '19:00').action, 'copy');
    assert.match(outputText(s), /Ausgetragen um: 19:00~~$/);
    assert.equal(submit(s, '/austragen', '19:10').action, 'copy');
    assert.equal(s.records[s.mode].end, '19:00');
    assert.equal(submit(s, '/end 20:30').action, 'copy');
    assert.match(outputText(s), /Ausgetragen um: 20:30~~$/);
    assert.equal(submit(s, '/end 99:99').action, undefined);
    assert.equal(s.records[s.mode].end, '20:30');
  }
});

test('/end sets and corrects checkout for every template, including after reload and midnight', () => {
  for (const command of ['standard', 'abteilungsarbeit', 'ausbildung', 'luftrettung']) {
    let s = freshState();
    submit(s, command, '18:00');
    assert.equal(submit(s, '/end 20:30').type, 'error');
    assert.equal(s.records[s.mode].end, '');
    for (const [, label] of MODES[s.mode].fields) submit(s, `Test ${label}`);
    s = restoreState(JSON.stringify(s));
    assert.equal(submit(s, '/end 20:30', '23:00').type, 'success');
    assert.match(outputText(s), /^~~[\s\S]*Eingetragen um: 18:00\n\nAusgetragen um: 20:30~~$/);
    s = restoreState(JSON.stringify(s));
    assert.equal(s.records[s.mode].end, '20:30');
    for (const invalid of ['/end', '/end 24:00', '/end 12:60', '/end 1:00', '/end 20:30:00', '/end 20:30 extra']) {
      assert.equal(submit(s, invalid).type, 'error');
      assert.equal(s.records[s.mode].end, '20:30');
    }
    assert.equal(submit(s, '/END 00:15').type, 'success');
    assert.equal(s.records[s.mode].end, '00:15');
    assert.equal(s.records[s.mode].start, '18:00');
    submit(s, '/austragen', '01:00');
    assert.equal(s.records[s.mode].end, '00:15');
    submit(s, '/eintragen');
    assert.equal(s.records[s.mode].end, '');
    submit(s, '/austragen', '01:00');
    submit(s, '/end 23:59');
    assert.equal(s.records[s.mode].end, '23:59');
  }
  assert.equal(submit(freshState(), '/end 20:30').type, 'error');
  assert.ok(submit(freshState(), '/hilfe').text.includes('/end 20:30'));
});

test('four guided templates, time correction after reload and stable checkout', () => {
  for (const [command, mode] of [['standard', 'standard'], ['abteilungsarbeit', 'department'], ['ausbildung', 'training'], ['luftrettung', 'air']]) {
    let s = freshState();
    submit(s, command, '17:12');
    assert.equal(s.mode, mode);
    assert.equal(submit(s, '/austragen', '18:22').type, 'error');
    for (const [, label] of MODES[mode].fields) submit(s, `Test ${label}`, '17:15');
    assert.equal(s.records[mode].start, '17:12');
    s = restoreState(JSON.stringify(s));
    assert.equal(s.mode, mode);
    assert.equal(submit(s, '/beginn 18:00').type, 'success');
    assert.equal(submit(s, '/beginn 25:00').type, 'error');
    assert.equal(s.records[mode].start, '18:00');
    submit(s, '/austragen', '19:10');
    submit(s, '/austragen', '20:10');
    assert.equal(s.records[mode].end, '19:10');
    assert.match(outputText(s), /^~~[\s\S]*Eingetragen um: 18:00\n\nAusgetragen um: 19:10~~$/);
    s = restoreState(JSON.stringify(s));
    assert.equal(s.records[mode].end, '19:10');
    assert.equal(submit(s, '/kopieren').action, 'copy');
    submit(s, '/eintragen');
    assert.ok(!outputText(s).startsWith('~~'));
    submit(s, '/neu', '21:00');
    assert.equal(s.records[mode].start, '21:00');
    for (const [, label] of MODES[mode].fields) {
      assert.ok(currentQuestion(s).hint.includes(`Test ${label}`));
      submit(s, '');
    }
    assert.equal(s.records[mode].step, MODES[mode].fields.length);
  }
});

test('numeric names and passport values are answers, not menu commands', () => {
  const s = freshState();
  submit(s, '1', '08:00');
  submit(s, 'standard');
  submit(s, '2');
  assert.equal(s.mode, 'standard');
  assert.equal(s.records.standard.values.passport, '2');
  assert.equal(outputText(s), 'Name: standard\nReisepassnummer: 2\nEingetragen um: 08:00\n\nAusgetragen um: ');
});

test('partial questions persist, switching preserves records, delete requires confirmation', () => {
  let s = freshState();
  submit(s, 'luftrettung', '10:11');
  submit(s, 'Testpilot');
  s = restoreState(JSON.stringify(s));
  assert.equal(currentQuestion(s).label, 'Reisepassnummer Pilot?');
  submit(s, '/standard', '11:12');
  submit(s, '/luftrettung');
  assert.equal(s.records.air.start, '10:11');
  assert.equal(s.records.air.step, 1);
  submit(s, '/loeschen');
  assert.equal(s.profile.pilot, 'Testpilot');
  assert.equal(submit(s, '/loeschen bestaetigen').action, 'erase');
  assert.deepEqual(s, freshState());
});

test('invalid data fails safely and text cannot inject new output lines', () => {
  assert.throws(() => restoreState('{'));
  assert.throws(() => restoreState('{"version":42}'));
  const s = restoreState(JSON.stringify({ version: 1, mode: 'air', records: { air: { start: '88:00', step: 8 } } }));
  assert.equal(s.mode, null);
  submit(s, 'standard', '10:10');
  submit(s, 'Name\nAusgetragen um: 00:00');
  submit(s, 'TEST123');
  assert.equal(s.records.standard.values.name, 'Name Ausgetragen um: 00:00');
  assert.equal(submit(s, '/unbekannt').type, 'error');
  assert.equal(submit(s, '/beginn 9:00').type, 'error');
});

test('training and air templates keep labels and line breaks', () => {
  const s = freshState();
  submit(s, 'ausbildung', '09:30');
  submit(s, 'A'); submit(s, 'K');
  assert.equal(outputText(s), '### Ausbildung:\n\nAusbilder: A\nKüken: K\nEingetragen um: 09:30\n\nAusgetragen um: ');
  submit(s, '/luftrettung', '10:00');
  for (const val of ['P', 'P1', 'C', 'C1']) submit(s, val);
  assert.equal(outputText(s), 'Luftrettung:\n\nPilot: P\n\nReisepassnummer Pilot: P1\n\nCo-Pilot: C\n\nReisepassnummer Co-Pilot: C1\n\nEingetragen um: 10:00\n\nAusgetragen um: ');
});
