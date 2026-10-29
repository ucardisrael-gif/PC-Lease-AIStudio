import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import bidiFactory from 'bidi-js';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const bidi = bidiFactory();
const font = fileURLToPath(new URL('./fonts/Alef-Regular.ttf', import.meta.url));
const logo = readFileSync(new URL('../public/brand/pc-lease-logo.svg', import.meta.url), 'utf8');
const money = n => `₪${(n / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function visual(text) { const s = String(text); return bidi.getReorderedString(s, bidi.getEmbeddingLevels(s, 'rtl')).replace(/[\u0590-\u05ff]+/g, run => [...run].reverse().join('')); }
export async function renderQuotePdf(record, lang = 'he') {
  const he = lang === 'he';
  const displayPrice = n => n === null || n === undefined ? (he ? 'לפי בקשה' : 'On request') : money(n);
  const groupTotal = items => items.some(item=>item.periodTotalMinor===null || item.periodTotalMinor===undefined) ? null : items.reduce((sum,item)=>sum+item.periodTotalMinor,0);
  const doc = new PDFDocument({ size:'A4', margin:40, bufferPages:true, info:{Title:'PC-LEASE',Author:'PC-LEASE'} });
  const chunks=[]; doc.on('data',c=>chunks.push(c));
  const done=new Promise((resolve,reject)=>{doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject)});
  doc.font(font);
  const text=(value,x,y,w,size=10,color='#17233a',align=he?'right':'left') => {
    doc.fontSize(size).fillColor(color);
    const source=String(value);
    if (!he || !/[\u0590-\u05ff]/.test(source)) return doc.text(source,x,y,{width:w,align,lineBreak:false,ellipsis:true});
    // Draw visual-order words separately: fontkit otherwise drops spaces in RTL runs.
    const tokens=visual(source).split(/\s+/).filter(Boolean), gap=size*0.35;
    const widths=tokens.map(token=>doc.widthOfString(token));
    let total=widths.reduce((a,b)=>a+b,0)+Math.max(0,tokens.length-1)*gap;
    while(tokens.length>1 && total>w){tokens.shift();total-=widths.shift()+gap;}
    let cursor=x+(align==='right'?Math.max(0,w-total):align==='center'?Math.max(0,(w-total)/2):0);
    tokens.forEach((token,i)=>{doc.text(token,cursor,y,{width:Math.min(widths[i]+2,w),lineBreak:false,ellipsis:true});cursor+=widths[i]+gap;});
  };
  const wrap=(value,w,size)=>{
    doc.fontSize(size);const chunks=[];let line='';const measure=value=>{const words=value.split(/\s+/).filter(Boolean);return words.reduce((sum,word)=>sum+doc.widthOfString(word),0)+Math.max(0,words.length-1)*size*.35;};
    for(const word of String(value??'').split(/\s+/).filter(Boolean)){
      let pieces=[],part='';for(const ch of word){if(part&&doc.widthOfString(part+ch)>w-10){pieces.push(part);part='';}part+=ch;}if(part)pieces.push(part);
      for(const piece of pieces){const next=line?line+' '+piece:piece;if(line&&measure(next)>w-10){chunks.push(line);line=piece;}else line=next;}
    }
    if(line)chunks.push(line);return chunks.length?chunks:['—'];
  };
  const left=40,width=515;
  SVGtoPDF(doc,logo,left,38,{width:150,height:33});
  text(record.kind==='offer'?(he?'הצעת מחיר':'PRICE ESTIMATE'):(he?'סיכום הזמנה':'ORDER SUMMARY'),300,48,255,17,'#1559d7','right');
  doc.moveTo(left,87).lineTo(left+width,87).strokeColor('#cbd7e6').stroke();
  let y=104;
  if(record.kind!=='offer'&&record.orderNumber){text(`${he?'מספר הזמנה':'Order number'}: ${record.orderNumber}`,left,y,width,10,'#52647a',he?'right':'left');y+=22;}
  text(he?'פרטי הלקוח':'CUSTOMER DETAILS',left,y,width,11,'#1559d7'); y+=23;
  const c=record.contact||{};
  const info=[[he?'חברה':'Company',c.companyName],[he?'איש קשר':'Contact',c.contactName],[he?'דוא״ל':'Email',c.email],[he?'טלפון':'Phone',c.phone]];
  if(c.taxId) info.push([he?'ח.פ':'Company ID',c.taxId]); if(c.city) info.push([he?'עיר':'City',c.city]);
  const infoLines=info.map(([label,value])=>wrap(`${label}: ${value||'—'}`,238,10));
  const infoHeights=Array.from({length:Math.ceil(info.length/2)},(_,i)=>Math.max(infoLines[i*2]?.length||0,infoLines[i*2+1]?.length||0)*13+10);
  const infoHeight=infoHeights.reduce((a,b)=>a+b,0);doc.roundedRect(left,y-5,width,infoHeight+10,7).fillAndStroke('#f5f8fc','#dce5f0');
  let infoY=y;for(let row=0;row<infoHeights.length;row++){for(let col=0;col<2;col++){const lines=infoLines[row*2+col];if(lines)lines.forEach((line,i)=>text(line,left+12+col*250,infoY+i*13,238,10));}infoY+=infoHeights[row];}
  y+=infoHeight+25;
  text(he?'פרטי הציוד':'ITEMS',left,y,width,11,'#1559d7'); y+=20;
  const cols=[{w:140,t:he?'דגם':'Model'},{w:75,t:he?'מק״ט':'SKU'},{w:100,t:he?'מסלול':'Plan'},{w:40,t:he?'כמות':'Qty'},{w:80,t:he?'מחיר ליחידה':'Unit price'},{w:80,t:he?'סה״כ':'Total'}];
  const header=()=>{doc.rect(left,y,width,26).fill('#eaf1fb');let x=left;for(const col of cols){text(col.t,x+4,y+7,col.w-8,8,'#1c3553','center');x+=col.w;}y+=26;};
  header();
  for(let i=0;i<record.quote.items.length;i++){
    const item=record.quote.items[i], product=record.products[i]||{};
    const plan=item.mode==='lease'?(he?'ליסינג / חודש':'Lease / month'):item.mode==='purchase'?(he?'רכישה':'Purchase'):(he?`השכרה ${item.rentalDays} ימים`:`Rent ${item.rentalDays} days`);
    const values=[product.title?.[lang]||product.model||item.productSlug,product.sku||'—',plan,String(item.quantity),displayPrice(item.unitAmountMinor),displayPrice(item.periodTotalMinor)];
    const wrapped=values.map((v,j)=>wrap(v,cols[j].w-8,j===0?8:9));const rowHeight=Math.max(35,Math.max(...wrapped.map(lines=>lines.length))*12+16);
    if(y+rowHeight>735){doc.addPage();y=45;header();}
    doc.rect(left,y,width,rowHeight).fillAndStroke(i%2?'#f8fafd':'#ffffff','#e2e8f0');
    let x=left;wrapped.forEach((lines,j)=>{lines.forEach((line,k)=>text(line,x+4,y+8+k*12,cols[j].w-8,j===0?8:9,'#17233a',j===0?'left':'center'));x+=cols[j].w;});y+=rowHeight;
  }
  if(y>705){doc.addPage();y=50;}
  const leaseItems=record.quote.items.filter(item=>item.mode==='lease');
  const purchaseItems=record.quote.items.filter(item=>item.mode==='purchase');
  const rentalDays=[...new Set(record.quote.items.filter(item=>item.mode==='short_rental').map(item=>item.rentalDays))];
  const sums=[];
  if(leaseItems.length) sums.push(`${he?'סה״כ חודשי לליסינג':'MONTHLY LEASE TOTAL'}: ${displayPrice(groupTotal(leaseItems))}`);
  if(purchaseItems.length) sums.push(`${he?'סה״כ רכישה':'PURCHASE TOTAL'}: ${displayPrice(groupTotal(purchaseItems))}`);
  for(const days of rentalDays){const group=record.quote.items.filter(item=>item.mode==='short_rental'&&item.rentalDays===days);sums.push(`${he?`סה״כ השכרה ${days} ימים`:`RENTAL TOTAL (${days} ${days===1?'DAY':'DAYS'})`}: ${displayPrice(groupTotal(group))}`);}
  y+=16;
  for(const sum of sums){if(y+32>745){doc.addPage();y=50;}doc.roundedRect(left,y,width,30,6).fill('#edf4ff');text(sum,left+12,y+9,width-24,12,'#154ec2','right');y+=34;}
  if(y+45>780){doc.addPage();y=50;}
  y+=12;text(he?'הזמינות ותנאי העסקה כפופים לאישור.':'Availability and terms are subject to confirmation.',left,y,width,9,'#52647a');
  y+=18;text(record.kind==='offer'?(he?'הצעה זו אינה הזמנה.':'This estimate is not an order.'):(he?'הזמנה ללא תשלום בשלב זה.':'No payment is required at this stage.'),left,y,width,9,'#52647a');
  doc.end();return done;
}
