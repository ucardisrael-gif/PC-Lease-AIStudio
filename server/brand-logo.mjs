import {readFileSync} from 'node:fs';

const original = readFileSync(new URL('../public/brand/logo-originals/logo-transparent.png',import.meta.url));

// Display the supplied artwork without its large transparent margins.
export function drawBrandLogo(doc,x,y,width) {
  const scale=width/463;
  doc.save().rect(x,y,width,120*scale).clip();
  doc.image(original,x-968*scale,y-340*scale,{width:2400*scale});
  doc.restore();
}
