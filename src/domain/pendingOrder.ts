import { AcquisitionMode, Language } from '../types';

export type PendingOrder = {
  id: string; lines: {productSlug:string;productVersion:number;mode:AcquisitionMode;quantity:number;rentalDays:number}[];
  lang: Language; source: 'website'; companyName:string; contactName:string; email:string; phone:string; taxId:string; city:string; notes:string;
};
const key='pc-lease:pending-customer-order';
export function readPendingOrder():PendingOrder|null {
  try {
    const p=JSON.parse(sessionStorage.getItem(key)||'null');
    if(!p||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id)||!['he','en'].includes(p.lang)||p.source!=='website'||!Array.isArray(p.lines)||p.lines.length<1||p.lines.length>25)return null;
    if(!['companyName','contactName','email','phone','taxId','city','notes'].every(k=>typeof p[k]==='string'&&p[k].length<=2000))return null;
    if(!p.lines.every((l:PendingOrder['lines'][number])=>l&&typeof l.productSlug==='string'&&l.productSlug.length>0&&l.productSlug.length<=120&&Number.isInteger(l.productVersion)&&l.productVersion>0&&['lease','purchase','short_rental'].includes(l.mode)&&Number.isInteger(l.quantity)&&l.quantity>=1&&l.quantity<=1000&&Number.isInteger(l.rentalDays)&&l.rentalDays>=1&&l.rentalDays<=365))return null;
    return p as PendingOrder;
  } catch {return null;}
}
export function writePendingOrder(order:PendingOrder){sessionStorage.setItem(key,JSON.stringify(order));}
export function clearPendingOrder(){sessionStorage.removeItem(key);}
