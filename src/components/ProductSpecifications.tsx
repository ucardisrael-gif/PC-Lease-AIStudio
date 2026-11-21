import React from 'react';
import {Language, LaptopProduct} from '../types';

export function productSpecs(product:LaptopProduct, lang:Language) {
  const he=lang==='he';
  const cpu=[product.cpu.exactModel||product.cpu.family,product.cpu.generation?`${he?'דור':'Gen'} ${product.cpu.generation}`:''].filter(Boolean).join(' · ');
  const rows:[string,string][]=[
    [he?'מעבד':'Processor',cpu],
    [he?'זיכרון':'Memory',product.ramGB?`${product.ramGB} GB RAM`:''],
    [he?'אחסון':'Storage',product.storage.capacityGB?`${product.storage.capacityGB} GB ${product.storage.type||''}`.trim():''],
    [he?'מסך':'Screen',product.screen.diagonalInches?`${product.screen.diagonalInches}″${product.screen.touch?(he?' · מסך מגע':' · Touch'):''}`:''],
    [he?'מערכת הפעלה':'Operating system',product.operatingSystem||''],
    ...(product.customSpecs||[]).map(s=>[he?s.nameHe:s.nameEn,he?s.valueHe:s.valueEn] as [string,string])
  ];
  return rows.filter(([name,value])=>name?.trim()&&value?.trim());
}

export function ProductSpecifications({product,lang,compact=false}:{product:LaptopProduct;lang:Language;compact?:boolean}) {
  const rows=productSpecs(product,lang);const he=lang==='he';
  return <div className="space-y-2">

    {rows.length?<dl className={`grid gap-2 ${compact?'grid-cols-1 sm:grid-cols-3':'grid-cols-1 sm:grid-cols-2'}`}>{(compact?rows.slice(0,3):rows).map(([name,value],i)=><div key={i} className="rounded-xl bg-[var(--bg-page)] p-2.5"><dt className="text-xs text-[var(--text-secondary)]">{name}</dt><dd className="mt-1 break-words text-sm font-semibold"><bdi>{value}</bdi></dd></div>)}</dl>:<p className="text-sm text-[var(--text-secondary)]">{he?'פרטי המפרט טרם הוזנו.':'Specifications have not yet been entered.'}</p>}
  </div>;
}

export function SpecChips({product,lang}:{product:LaptopProduct;lang:Language}) {
  return <dl className="mt-2 flex flex-wrap gap-1.5">{productSpecs(product,lang).slice(0,4).map(([name,value],i)=><div key={i} className="inline-flex items-center gap-1 rounded-lg border border-sky-100 bg-sky-50 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"><dt className="text-[var(--text-secondary)]">{name}:</dt><dd className="font-semibold"><bdi>{value}</bdi></dd></div>)}</dl>;
}
