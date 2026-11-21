import {readFileSync} from 'node:fs';

const original = readFileSync(new URL('../public/brand/current/logo.png',import.meta.url));

// Shared by quotations, order summaries and contract drafts.
export function drawBrandLogo(doc,x,y,width) {
  doc.image(original,x,y,{width,height:width*260/1000});
}
