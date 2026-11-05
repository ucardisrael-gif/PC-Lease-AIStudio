import test from 'node:test';
import assert from 'node:assert/strict';
import {visualPdfWords} from '../pdf-rtl.mjs';

test('Hebrew punctuation stays outside the word and Latin identifiers remain intact',()=>{
  assert.deepEqual(visualPdfWords('מספר הזמנה: 12345'),[['12345'],[':','הזמנה'],['מספר']]);
  assert.deepEqual(visualPdfWords('דוא״ל: test@example.invalid'),[['test@example.invalid'],[':','דוא״ל']]);
  assert.deepEqual(visualPdfWords('ח.פ: 513640045'),[['513640045'],[':','פ.ח']]);
  assert.deepEqual(visualPdfWords('הזמנה הושלמה.'),[['.','הושלמה'],['הזמנה']]);
  assert.deepEqual(visualPdfWords('Company: אלפא מחשבים','ltr'),[['Company:'],['מחשבים'],['אלפא']]);
});
