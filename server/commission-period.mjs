// Mixed orders have no single safe default duration; an end date is then manual.
export function commissionDefaultMonths(terms){
 if(terms?.quote){const items=terms.quote.items;return Array.isArray(items)&&items.length&&items.every(x=>x?.mode==='lease'&&Number.isInteger(x.termMonths)&&x.termMonths>0&&x.termMonths<=1200&&x.termMonths===items[0].termMonths)?items[0].termMonths:null;}
 const months=terms?.price?.termMonths;
 return terms?.mode==='lease'&&Number.isInteger(months)&&months>0&&months<=1200?months:null;
}
