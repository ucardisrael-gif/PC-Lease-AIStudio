// Export the selected artwork itself; do not redraw its curves or typography.
import sharp from 'sharp';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
const base=new URL('../',import.meta.url);
const source=new URL('PC-Lease-PL-comparison.png',base);
const current=new URL('public/brand/current/',base);
const delivery=new URL('output/brand/PC-Lease-PL/',base);
const {data,info}=await sharp(await readFile(source)).extract({left:510,top:491,width:1175,height:225}).removeAlpha().raw().toBuffer({resolveWithObject:true});
// Remove only the nearly-white paper background, keeping selected artwork colors.
const rgba=Buffer.alloc(info.width*info.height*4);
for(let p=0;p<info.width*info.height;p++){
 const rgb=[data[p*3],data[p*3+1],data[p*3+2]],low=Math.min(...rgb);
 const a=low>246?0:low>225?(246-low)/21:1;
 for(let c=0;c<3;c++)rgba[p*4+c]=a?Math.max(0,Math.min(255,(rgb[c]-255*(1-a))/a)):0;
 rgba[p*4+3]=Math.round(a*255);
}
const png=await sharp(rgba,{raw:{width:1175,height:225,channels:4}}).png().toBuffer();
await writeFile(new URL('approved-original.png',current),png);
const wrap=(buffer,viewBox,placement)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><title>PC-LEASE</title><image ${placement} href="data:image/png;base64,${buffer.toString('base64')}"/></svg>`;
// Preserve existing layout boxes without stretching the artwork.
const svg=wrap(png,'0 0 1000 260','x="0" y="34.2553" width="1000" height="191.4894"');
const symbol=await sharp(png).extract({left:0,top:0,width:340,height:225}).png().toBuffer();
const icon=wrap(symbol,'0 0 340 225','width="340" height="225"');
await writeFile(new URL('icon.svg',current),icon);
for(const suffix of ['', '-dark']){
 await writeFile(new URL(`logo${suffix}.svg`,current),svg);
 await writeFile(new URL(`logo${suffix}.png`,current),await sharp(Buffer.from(svg)).resize({width:1600}).png().toBuffer());
 await writeFile(new URL(`PC-Lease${suffix}.svg`,delivery),svg);
 await copyFile(new URL(`logo${suffix}.png`,current),new URL(`PC-Lease-site${suffix}.png`,delivery));
 await writeFile(new URL(`PC-Lease-video${suffix}-3840.png`,delivery),await sharp(Buffer.from(svg)).resize({width:3840}).png().toBuffer());
}
for(const size of [32,64,180,512])await writeFile(new URL(`icon-${size}.png`,current),await sharp(symbol).resize(size,size,{fit:'contain',background:'#ffffff00'}).png().toBuffer());
await copyFile(new URL('icon.svg',current),new URL('PC-Lease-symbol.svg',delivery));
await copyFile(new URL('icon-512.png',current),new URL('PC-Lease-symbol.png',delivery));
await copyFile(new URL('logo.svg',current),new URL('public/brand/pc-lease-logo.svg',base));
await copyFile(new URL('logo-dark.svg',current),new URL('public/brand/pc-lease-logo-on-dark.svg',base));
await copyFile(new URL('icon-64.png',current),new URL('public/brand/favicon.png',base));
console.log('Selected third artwork exported without vector redrawing. SVG contains original raster artwork.');
