import {getHero,getTrust,getSection,saveHero,saveTrust,saveSection} from './site-blocks.mjs';
import {requireTransactionPermission} from './transaction-permissions.mjs';
import {sectionDefaults} from '../src/data/section-defaults.mjs';
const validKey=key=>key==='hero'||key==='trust'||Object.hasOwn(sectionDefaults,key);
export async function saveSiteBlockWithHistory(db,key,actor,input,access){
 if(!validKey(key))throw Error('invalid_input');
 const c=await db.connect();try{
  await c.query('BEGIN');access=await requireTransactionPermission(c,actor,'content');await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['site-block:'+key]);
  const before=key==='hero'?await getHero(c):key==='trust'?await getTrust(c):await getSection(c,key);
  const after=key==='hero'?await saveHero(c,input,access):key==='trust'?await saveTrust(c,input):await saveSection(c,key,input,access);
  await c.query('INSERT INTO site_block_history(block_key,actor_user_id,previous_content,new_content,new_version) VALUES($1,$2,$3,$4,$5)',[key,actor,JSON.stringify(before.content),JSON.stringify(after.content),after.version]);
  await c.query('COMMIT');return after;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function listSiteBlockHistory(db,params){
 const key=params.get('key'),offset=params.get('offset')||'0',before=params.get('before')||'';
 if(!validKey(key)||!/^\d{1,7}$/.test(offset)||(before&&(!/^[1-9]\d{0,17}$/.test(before)||Number(offset)!==0)))throw Error('invalid_input');
 const c=await db.connect();try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  if(before&&!(await c.query('SELECT 1 FROM site_block_history WHERE block_key=$1 AND id=$2::bigint',[key,before])).rowCount)throw Error('invalid_input');
  const rows=(await c.query("SELECT h.id::text,h.previous_content,h.new_content,h.new_version,h.created_at,u.email AS actor_email FROM site_block_history h JOIN users u ON u.id=h.actor_user_id WHERE h.block_key=$1 AND ($3::text='' OR h.id<NULLIF($3,'')::bigint) ORDER BY h.id DESC LIMIT 26 OFFSET $2",[key,Number(offset),before])).rows;
  await c.query('COMMIT');return {events:rows.slice(0,25),hasMore:rows.length>25,offset:Number(offset),cursorSupported:true};
 }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
}
