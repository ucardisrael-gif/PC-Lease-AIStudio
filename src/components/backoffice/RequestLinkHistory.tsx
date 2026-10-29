import React, { useEffect, useRef, useState } from 'react';
import { Language } from '../../types';

export type LinkEvent = { id?:string; created_at:string; actor_email:string; old_email?:string|null; new_email?:string|null; previous_organization_name?:string|null; new_organization_name?:string|null };

export function RequestLinkHistory({lang,requestId,kind,entity='request',initial,hasMore=false}:{lang:Language;requestId:string;kind:'customer'|'organization';entity?:'request'|'user';initial:LinkEvent[];hasMore?:boolean}) {
  const [events,setEvents]=useState(initial),[more,setMore]=useState(hasMore),[state,setState]=useState<'ready'|'loading'|'error'>('ready');
  const generation=useRef(0);
  useEffect(()=>{generation.current++;setEvents(initial);setMore(hasMore);setState('ready');return()=>{generation.current++;};},[requestId,kind,entity,initial,hasMore]);
  const load=async()=>{
    const before=events.at(-1)?.id;if(!before||state==='loading')return;
    const current=generation.current;setState('loading');
    try{const query=entity==='user'?new URLSearchParams({userId:requestId,before}):new URLSearchParams({requestId,kind,before});const response=await fetch(`${entity==='user'?'/api/admin/users/organization-history':'/api/admin/requests/link-history'}?${query}`);if(!response.ok)throw Error();const data=await response.json();if(current!==generation.current)return;setEvents(previous=>[...previous,...data.history]);setMore(data.hasMore);setState('ready');}
    catch{if(current===generation.current)setState('error');}
  };
  if(!events.length)return null;
  return <details><summary className="underline cursor-pointer">{kind==='customer'?(lang==='he'?'היסטוריית שיוך חשבון':'Account link history'):(lang==='he'?'היסטוריית שיוך':'Link history')}</summary><ul className="mt-2">{events.map((event,i)=><li key={event.id||i}>{new Date(event.created_at).toLocaleString()} · <bdi>{(kind==='customer'?event.old_email:event.previous_organization_name)||'—'}</bdi> → <bdi>{(kind==='customer'?event.new_email:event.new_organization_name)||'—'}</bdi> · <bdi>{event.actor_email}</bdi></li>)}</ul>{more&&<button type="button" disabled={state==='loading'} onClick={load} className="underline mt-2">{state==='loading'?(lang==='he'?'טוען...':'Loading...'):(lang==='he'?'הצג היסטוריה נוספת':'Show more history')}</button>}{state==='error'&&<p role="alert">{lang==='he'?'לא ניתן לטעון היסטוריה. נסו שוב.':'Could not load history. Try again.'}</p>}</details>;
}
