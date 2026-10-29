import React, { useState } from 'react';
import { Language } from '../../types';

export function SiteImageUpload({lang, onUploaded, onBusy}: {lang: Language; onUploaded: (path:string)=>void; onBusy:(busy:boolean)=>void}) {
  const he=lang==='he';
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const upload=async(file:File)=>{
    if(file.size>4194304||!['image/jpeg','image/png','image/webp'].includes(file.type)){setMessage(he?'יש לבחור תמונת JPEG, PNG או WebP עד 4MB.':'Choose a JPEG, PNG or WebP image up to 4 MB.');return;}
    setBusy(true);onBusy(true);setMessage('');
    try {
      const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error());reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(file);});
      const response=await fetch('/api/admin/site/media',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data})});
      if(!response.ok)throw Error();const result=await response.json();onUploaded(result.path);
      setMessage(he?'התמונה הועלתה. יש לשמור את השינויים כדי להציג אותה באתר.':'Image uploaded. Save changes to show it on the site.');
    } catch {setMessage(he?'לא ניתן להעלות את התמונה.':'Could not upload the image.');} finally {setBusy(false);onBusy(false);}
  };
  return <div className="mb-3"><label className="block text-xs font-semibold">{he?'העלאת תמונה מהמחשב (עד 4MB)':'Upload image from computer (up to 4 MB)'}<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" className="block mt-2" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.currentTarget.value='';}} /></label>{message&&<p role="status" className="text-sm mt-2">{message}</p>}</div>;
}
