import bidiFactory from 'bidi-js';

const bidi=bidiFactory();

// PDFKit shapes Hebrew within a run. Keep surrounding punctuation in its own
// run so the colon or full stop is not moved inside the Hebrew word again.
export function visualPdfWords(value,direction='rtl') {
  const source=String(value);
  const reordered=bidi.getReorderedString(source,bidi.getEmbeddingLevels(source,direction))
    .replace(/[\u0590-\u05ff]+/g,run=>[...run].reverse().join(''));
  return reordered.split(/\s+/).filter(Boolean).map(word=>{
    const match=word.match(/^([:;,.!?]+)?([\u0590-\u05ff]+(?:\.[\u0590-\u05ff]+)*)([:;,.!?]+)?$/u);
    // Font shaping reverses dotted Hebrew compounds a second time when they
    // are drawn as one run. Draw each word and dot independently instead.
    return match?[match[1],...match[2].split(/(\.)/),match[3]].filter(Boolean):[word];
  });
}
