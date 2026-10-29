import React from 'react';
import {Language} from '../../types';
export type ServiceLine={mode?:string;rentalDays?:number|null;termMonths?:number|null};
export function ServiceOrderLine({index,line,lang}:{index:number|null|undefined;line:ServiceLine|null|undefined;lang:Language}){
 if(index==null)return null;const he=lang==='he';const mode=line?.mode==='lease'?(he?'ליסינג':'Lease'):line?.mode==='short_rental'?(he?'השכרה':'Rental'):line?.mode==='purchase'?(he?'רכישה':'Purchase'):(he?'מסלול לא נשמר':'Plan not recorded');const term=line?.mode==='short_rental'&&line.rentalDays!=null?` · ${line.rentalDays} ${he?'ימים':'days'}`:line?.mode==='lease'&&line.termMonths!=null?` · ${line.termMonths} ${he?'חודשים':'months'}`:'';
 return <p className="text-sm">{he?'פריט בהזמנה':'Order line'}: {index+1} · {mode}{term}</p>;
}
