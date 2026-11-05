import React from 'react';
import { ImagePlus } from 'lucide-react';
import { Language } from '../../types';

export function ProductPhotoUpload({lang, busy, onSelect}:{lang:Language;busy:boolean;onSelect:(files:File[])=>void}) {
  const he=lang==='he';
  return <div className="space-y-2">
    <p className="font-semibold">{he?'תמונות המוצר':'Product photos'}</p>
    <label className={`inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200 focus-within:outline focus-within:outline-2 focus-within:outline-blue-600 ${busy?'cursor-wait opacity-60':'cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900'}`}>
      <ImagePlus className="h-5 w-5" aria-hidden="true"/>
      {busy?(he?'מעלה תמונות…':'Uploading photos…'):(he?'העלאת תמונות':'Upload photos')}
      <input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} className="sr-only" onChange={e=>{const files=Array.from(e.target.files||[]);if(files.length)onSelect(files);e.currentTarget.value='';}}/>
    </label>
    <p className="text-sm text-slate-500">{he?'עד 10 תמונות · JPEG, PNG או WebP · עד 4MB לתמונה. לאחר ההעלאה יש לשמור את המוצר.':'Up to 10 photos · JPEG, PNG or WebP · up to 4 MB each. Save the product after uploading.'}</p>
  </div>;
}
