import React from 'react';
import {Language} from '../../types';
export type SavedProductTerms={purchasePrice?:number|null;leasePriceMonthly?:number|null;leaseTermMonths?:number|null;rentalRates?:{dailyShort?:number|null;dailyWeek?:number|null;monthly?:number|null;shortMaxDays?:number;weekMaxDays?:number}|null};
export function OrderTerms({product,lang}:{product:SavedProductTerms|undefined;lang:Language}){
 const he=lang==='he';
 const missing=he?'לא נשמר':'Not recorded';
 const amount=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?'₪'+n.toLocaleString():missing;
 const day=(n:unknown)=>Number.isInteger(n)?String(n):missing;
 const r=product?.rentalRates;
 return <details className="ms-3 text-xs"><summary className="cursor-pointer underline">{he?'תנאים שמורים בעת ההזמנה':'Terms saved at order time'}</summary><div className="ps-3 pt-1 space-y-1"><p>{he?'מחיר רכישה ליחידה':'Purchase per unit'}: {amount(product?.purchasePrice)} · {he?'ליסינג לחודש ליחידה':'Lease per unit per month'}: {amount(product?.leasePriceMonthly)} · {he?'חודשי ליסינג':'Lease months'}: {day(product?.leaseTermMonths)}</p><p>{he?'תעריף יומי ראשון':'First daily rate'}: {amount(r?.dailyShort)} · {he?'עד יום':'Through day'}: {day(r?.shortMaxDays)} · {he?'תעריף יומי שני':'Second daily rate'}: {amount(r?.dailyWeek)} · {he?'עד יום':'Through day'}: {day(r?.weekMaxDays)} · {he?'תעריף ל־30 יום':'30-day rate'}: {amount(r?.monthly)}</p></div></details>;
}
