import React, { useEffect, useRef, useState } from 'react';
import { Language } from '../../types';

type Event = { id: string; previous_status: string; new_status: string; actor_email: string; created_at: string };

export function RequestStatusHistory({ requestId, lang, initial, hasMore, statusLabel }: { requestId:string; lang:Language; initial:Event[]; hasMore:boolean; statusLabel:(status:string)=>string }) {
  const [events,setEvents]=useState(initial);
  const [more,setMore]=useState(hasMore);
  const [state,setState]=useState<'ready'|'loading'|'error'>('ready');
  const generation=useRef(0);
  useEffect(()=>{generation.current++;setEvents(initial);setMore(hasMore);setState('ready');return()=>{generation.current++;};},[requestId,initial,hasMore]);
  const load=async()=>{
    if(state==='loading'||!events.length)return;
    const currentGeneration=generation.current;
    setState('loading');
    try{
      const query=new URLSearchParams({requestId,before:events[events.length-1].id});
      const response=await fetch(`/api/admin/requests/status-history?${query}`);
      if(!response.ok)throw Error();
      const data=await response.json();
      if(currentGeneration!==generation.current)return;
      setEvents(current=>[...current,...data.history]);setMore(data.hasMore);setState('ready');
    }catch{if(currentGeneration===generation.current)setState('error');}
  };
  if(!events.length)return null;
  return <details><summary className="cursor-pointer underline">{lang==='he'?'היסטוריית סטטוס':'Status history'}</summary><ul className="mt-2 space-y-1">{events.map(event=><li key={event.id}>{new Date(event.created_at).toLocaleString()} · {statusLabel(event.previous_status)} → {statusLabel(event.new_status)} · <bdi>{event.actor_email}</bdi></li>)}</ul>{more&&<button type="button" disabled={state==='loading'} onClick={load} className="underline mt-2">{state==='loading'?(lang==='he'?'טוען...':'Loading...'):(lang==='he'?'הצג היסטוריה נוספת':'Show more history')}</button>}{state==='error'&&<p role="alert">{lang==='he'?'לא ניתן לטעון היסטוריה. נסו שוב.':'Could not load history. Try again.'}</p>}</details>;
}
