import PDFDocument from 'pdfkit';
import {drawBrandLogo} from './brand-logo.mjs';
import bidiFactory from 'bidi-js';
import {fileURLToPath} from 'node:url';
const font=fileURLToPath(new URL('./fonts/Alef-Regular.ttf',import.meta.url));
const bidi=bidiFactory();
export function contractOrderLines(order,lang='he'){
 const he=lang==='he',quoteItems=order?.terms?.quote?.items;
 if(order?.terms?.quote&&!Array.isArray(quoteItems))return [he?'פרטי הפריט השמור אינם זמינים':'Saved item details unavailable'];
 const legacy=!Array.isArray(quoteItems)&&!order?.terms?.quote;
 const price=order?.terms?.price;
 const items=legacy?[{quantity:order?.quantity,mode:order?.terms?.mode,rentalDays:order?.terms?.rentalDays??price?.rentalDays,termMonths:price?.termMonths,period:price?.period,periodTotalMinor:price?.totalAmountMinor}]:Array.isArray(quoteItems)?quoteItems:[];
 const products=legacy?[order?.products??{}]:Array.isArray(order?.products?.quoteProducts)?order.products.quoteProducts:[];
 const inconsistent=!legacy&&(!items.length||items.length!==products.length||items.some(item=>!item||typeof item!=='object'||Array.isArray(item))||products.some(product=>!product||typeof product!=='object'||Array.isArray(product)));
 const result=items.map((item,i)=>{
  if(!item||typeof item!=='object'||Array.isArray(item))return he?'פרטי הפריט השמור אינם זמינים':'Saved item details unavailable';
  const product=products[i]&&typeof products[i]==='object'?products[i]:{};
  const mode=item.mode==='lease'?(he?'ליסינג':'Lease'):item.mode==='short_rental'?(he?'השכרה':'Rental'):item.mode==='purchase'?(he?'רכישה':'Purchase'):(he?'מסלול לא ידוע':'Plan unknown');
  const duration=item.mode==='short_rental'&&Number.isSafeInteger(item.rentalDays)&&item.rentalDays>0?`${item.rentalDays} ${he?'ימים':'days'}`:item.mode==='lease'&&Number.isSafeInteger(item.termMonths)&&item.termMonths>0?`${item.termMonths} ${he?'חודשים':'months'}`:null;
  const expectedPeriod=item.mode==='lease'?'month':item.mode==='short_rental'?'rental_period':item.mode==='purchase'?'one_time':null;
  const period=item.period==='month'?(he?'לחודש':'per month'):item.period==='rental_period'?(he?'לתקופת ההשכרה':'rental period'):item.period==='one_time'?(he?'חד פעמי':'one-time'):null;
  const validAmount=Number.isSafeInteger(item.periodTotalMinor)&&item.periodTotalMinor>=0&&expectedPeriod!==null&&item.period===expectedPeriod;
  const amount=item.periodTotalMinor===null?(he?'מחיר לפי בקשה':'Price on request'):validAmount?`₪${(item.periodTotalMinor/100).toFixed(2)} / ${period}`:(he?'מחיר לא נשמר':'Price not recorded');
  const model=typeof product.model==='string'&&product.model.trim()?product.model:typeof item.productSlug==='string'&&item.productSlug.trim()?item.productSlug:'—';
  const sku=typeof product.sku==='string'&&product.sku.trim()?`${he?'מק״ט':'SKU'}: ${product.sku}`:null;
  const quantity=Number.isSafeInteger(item.quantity)&&item.quantity>0?item.quantity:'—';
  return [model,sku,`${he?'כמות':'Quantity'}: ${quantity}`,mode,duration,amount].filter(Boolean).join(' · ');
 });
 return inconsistent?[he?'נתוני פריטי ההזמנה אינם תואמים; יש לבדוק את הרשומה.':'Order item data is inconsistent; review the record.',...result]:result;
}
export async function renderContractDraft(record,lang='he'){
 const he=lang==='he',doc=new PDFDocument({size:'A4',margin:40,autoFirstPage:true,info:{Title:'PC-LEASE - DRAFT',Author:'PC-LEASE'}}),chunks=[];
 doc.on('data',chunk=>chunks.push(chunk));const done=new Promise((resolve,reject)=>{doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});doc.font(font);
 let y=40;const left=40,width=515,bottom=790;
 function line(text,size=10,color='#17233a',right=he){
  if(y+size+8>bottom){doc.addPage();y=45;}
  doc.fontSize(size).fillColor(color);
  const rtl=/[\u0590-\u05ff]/.test(text);let words=text.split(/\s+/).filter(Boolean);
  if(rtl){const display=bidi.getReorderedString(text,bidi.getEmbeddingLevels(text,'rtl')).replace(/[\u0590-\u05ff]+/g,run=>[...run].reverse().join(''));words=display.split(/\s+/).filter(Boolean);}
  const gap=size*.35,widths=words.map(word=>doc.widthOfString(word));const used=widths.reduce((a,b)=>a+b,0)+Math.max(0,words.length-1)*gap;
  let x=left+(right?Math.max(0,width-used):0);words.forEach((word,i)=>{doc.text(word,x,y,{width:Math.max(2,widths[i]+2),lineBreak:false});x+=widths[i]+gap;});y+=size+7;
 }
 function paragraph(value,size=10,color='#17233a',right=he){
  doc.fontSize(size);for(const raw of String(value).split(/\r?\n/)){let current='';const words=raw.split(/\s+/).filter(Boolean);if(!words.length){line('',size,color,right);continue;}
   for(const word of words){let piece='';for(const char of word){if(doc.widthOfString(piece+char)>width-12&&piece){if(current){line(current,size,color,right);current='';}line(piece,size,color,right);piece='';}piece+=char;}
    const candidate=current?current+' '+piece:piece;if(doc.widthOfString(candidate)>width-12&&current){line(current,size,color,right);current=piece;}else current=candidate;}
   if(current)line(current,size,color,right);
  }
 }
 drawBrandLogo(doc,left,y,120);y+=48;
 paragraph(he?'טיוטה פנימית — לא חתום':'INTERNAL DRAFT — NOT SIGNED',15,'#b42318',he);
 paragraph(record.title|| (he?'טיוטת חוזה':'Contract draft'),14,'#1559d7',he);
 function detail(label,value){
  if(he){paragraph(label,9,'#52647a',true);paragraph(String(value),10,'#17233a',true);}
  else paragraph(`${label}: ${value}`,9,'#52647a',false);
 }
 detail(he?'מספר טיוטה':'Draft ID',record.id);
 detail(he?'גרסה':'Version',record.version);
 if(record.orderNumber)detail(he?'מספר הזמנה':'Order number',record.orderNumber);
 detail(he?'הזמנה':'Order',record.requestId);
 const contact=record.order?.contact&&typeof record.order.contact==='object'?record.order.contact:{};
 for(const [label,value] of [[he?'חברה':'Company',contact.companyName],[he?'איש קשר':'Contact',contact.contactName],[he?'דוא״ל':'Email',contact.email],[he?'טלפון':'Phone',contact.phone],[he?'מספר רישום':'Registration number',contact.taxId],[he?'עיר':'City',contact.city]])if(value)detail(label,value);
 y+=8;paragraph(he?'פרטי הזמנה':'Order details',12,'#1559d7',he);
 for(const item of contractOrderLines(record.order,lang))paragraph(item,10,'#17233a',he);
 y+=8;paragraph(he?'תנאים שהוזנו':'Entered terms',12,'#1559d7',he);
 paragraph(record.terms|| (he?'לא הוזנו תנאים.':'No terms have been entered.'));
 y+=10;paragraph(he?'טיוטה זו אינה מסמך חתום.':'This draft is not a signed document.',10,'#b42318',he);
 doc.end();return done;
}
