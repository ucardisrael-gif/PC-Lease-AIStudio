import React,{useEffect,useState} from 'react';

type Event={id:string;action:string;actor_id:string;actor_name:string;created_at:string;details?:{changed?:string[]}};
const labels:Record<string,[string,string]>={created:['נוצר','Created'],updated:['עודכן','Updated'],moved:['הועבר','Moved'],archived:['הועבר לארכיון','Archived'],auto_archived:['הועבר לארכיון אוטומטית','Automatically archived'],restored:['שוחזר','Restored']};
export function CrmCardHistoryTab({he,boardId,cardId}:{he:boolean;boardId:string;cardId:string}){
 const [events,setEvents]=useState<Event[]>([]),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setFailed(false);fetch('/api/admin/crm-work/cards/history?'+new URLSearchParams({boardId,cardId}),{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>setEvents(data.history)).catch(()=>{if(!controller.signal.aborted)setFailed(true)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[boardId,cardId]);
 if(loading)return <p role="status">{he?'טוען היסטוריה…':'Loading history…'}</p>;
 if(failed)return <p role="alert">{he?'לא ניתן לטעון היסטוריה.':'Could not load history.'}</p>;
 if(!events.length)return <p>{he?'אין היסטוריה לכרטיס.':'No history for this card.'}</p>;
 return <ol className="space-y-2">{events.map(e=><li key={e.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700"><strong>{labels[e.action]?.[he?0:1]||e.action}</strong><p className="text-slate-500"><bdi>{e.actor_name||e.actor_id}</bdi> · {new Date(e.created_at).toLocaleString()}</p>{Array.isArray(e.details?.changed)&&e.details.changed.length>0&&<p><bdi>{e.details.changed.join(', ')}</bdi></p>}</li>)}</ol>;
}
