import {currentUser} from './auth.mjs';
import * as crm from './crm-work.mjs';
const listeners=new Set();
const handlers={
 'GET /boards':async(db,u,p)=>({boards:await crm.listBoards(db,u,p.get('archived')==='true')}),
 'GET /boards/history':async(db,u,p)=>({history:await crm.boardHistory(db,u,p.get('boardId'))}),
 'POST /boards':async(db,u,p,b)=>({board:await crm.saveBoard(db,u,b)}),
 'POST /boards/setup':async(db,u,p,b)=>({board:await crm.setupFirstBoard(db,u,b)}),
 'POST /boards/reorder':async(db,u,p,b)=>crm.reorderBoards(db,u,b),
 'POST /boards/printing':async(db,u,p,b)=>({board:await crm.setBoardPrinting(db,u,b)}),
 'POST /boards/archive':async(db,u,p,b)=>({board:await crm.archiveBoard(db,u,b)}),
 'POST /boards/delete':async(db,u,p,b)=>crm.permanentlyDeleteBoard(db,u,b),
 'GET /columns':async(db,u,p)=>({columns:await crm.listColumns(db,u,p.get('boardId'),p.get('archived')==='true')}),
 'POST /columns':async(db,u,p,b)=>({column:await crm.saveColumn(db,u,b)}),
 'POST /columns/duplicate':async(db,u,p,b)=>({column:await crm.duplicateColumn(db,u,b)}),
 'POST /columns/archive':async(db,u,p,b)=>({column:await crm.archiveColumn(db,u,b)}),
 'POST /columns/delete':async(db,u,p,b)=>crm.permanentlyDeleteColumn(db,u,b),
 'POST /columns/automation':async(db,u,p,b)=>({column:await crm.setColumnAutomation(db,u,b)}),
 'POST /columns/reorder':async(db,u,p,b)=>crm.reorderColumns(db,u,b),
 'GET /fields':async(db,u,p)=>({fields:await crm.listFields(db,u,p.get('boardId'))}),
 'GET /print-templates':async(db,u,p)=>({templates:await crm.listPrintTemplates(db,u,p.get('boardId'))}),
 'POST /print-templates':async(db,u,p,b)=>({template:await crm.savePrintTemplate(db,u,b)}),
 'POST /print-templates/delete':async(db,u,p,b)=>crm.deletePrintTemplate(db,u,b),
 'POST /fields':async(db,u,p,b)=>({field:await crm.saveField(db,u,b)}),
 'POST /fields/delete':async(db,u,p,b)=>crm.deleteUnusedField(db,u,b),
 'GET /assignees':async(db,u,p)=>crm.listAssignees(db,u),
 'POST /fields/reorder':async(db,u,p,b)=>crm.reorderFields(db,u,b),
 'GET /cards':async(db,u,p)=>crm.listCards(db,u,{boardId:p.get('boardId'),archived:p.get('archived')==='true',search:p.get('search')||'',offset:Number(p.get('offset')||0),assignee:p.get('assignee')||'',recentDays:Number(p.get('recentDays')||0)}),
 'POST /cards':async(db,u,p,b)=>({card:await crm.saveCard(db,u,b)}),
 'POST /cards/move':async(db,u,p,b)=>({card:await crm.moveCard(db,u,b)}),
 'POST /cards/archive':async(db,u,p,b)=>({card:await crm.archiveCard(db,u,b)}),
 'POST /cards/delete':async(db,u,p,b)=>crm.permanentlyDeleteCard(db,u,b),
 'POST /cards/bulk':async(db,u,p,b)=>crm.bulkCards(db,u,b),
 'GET /cards/access':async(db,u,p)=>crm.checkCardAccess(db,u,p.get('boardId'),p.get('cardId')),
 'GET /cards/print':async(db,u,p)=>crm.getPrintCard(db,u,p.get('boardId'),p.get('cardId'),p.get('templateId')),
 'GET /cards/history':async(db,u,p)=>({history:await crm.cardHistory(db,u,p.get('boardId'),p.get('cardId'))}),
 'GET /visibility':async(db,u,p)=>crm.getVisibility(db,u,p.get('userId')),
 'GET /shifts':async(db,u,p)=>({shifts:await crm.listStaffShifts(db,u,{from:p.get('from'),to:p.get('to')})}),
 'POST /shifts':async(db,u,p,b)=>({shift:await crm.saveStaffShift(db,u,b)}),
 'POST /shifts/cancel':async(db,u,p,b)=>crm.cancelStaffShift(db,u,b),
 'POST /visibility':async(db,u,p,b)=>crm.setVisibility(db,u,b),
};
export async function handleCrmWork(req,res,{db,sessionToken,allowedOrigin,readJson}){
 const url=new URL(req.url,'http://localhost'),path=url.pathname.slice('/api/admin/crm-work'.length),handler=handlers[`${req.method} ${path}`];
 if(path==='/events'&&req.method==='GET'){
  try{const user=await currentUser(db,sessionToken(req));if(!user)throw Error('forbidden');await crm.listBoards(db,user);res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});let closed=false,busy=false,pending=false;const tick=async()=>{if(closed)return;if(busy){pending=true;return}busy=true;try{const current=await currentUser(db,sessionToken(req));if(!current)throw Error('forbidden');await crm.listBoards(db,current);if(!res.write('event: refresh\ndata: 1\n\n')){closed=true;cleanup();res.end()}}catch{closed=true;cleanup();res.end()}finally{busy=false;if(pending&&!closed){pending=false;queueMicrotask(tick)}}};const timer=setInterval(tick,15000);timer.unref();const cleanup=()=>{clearInterval(timer);listeners.delete(tick)};listeners.add(tick);req.on('close',()=>{closed=true;cleanup()});await tick();return}catch{if(!res.headersSent)res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return}
 }
 if(!handler){res.writeHead(404).end(JSON.stringify({error:'not_found'}));return}
 try{const user=await currentUser(db,sessionToken(req));if(!user||(req.method==='POST'&&!allowedOrigin(req)))throw Error('forbidden');const body=req.method==='POST'?await readJson(req,65536):undefined;const result=await handler(db,user,url.searchParams,body);res.writeHead(200).end(JSON.stringify(result));if(req.method==='POST')for(const notify of listeners)void notify()}
 catch(e){const allowed=['forbidden','invalid_input','not_found','version_conflict','limit_exceeded','field_in_use','column_not_empty','board_not_empty'];const code=allowed.includes(e.message)?e.message:e.code==='23505'?'version_conflict':e.code==='23503'||e.code==='23514'?'invalid_input':'unavailable';res.writeHead(code==='forbidden'?403:code==='not_found'?404:['version_conflict','field_in_use','column_not_empty','board_not_empty'].includes(code)?409:code==='invalid_input'||code==='limit_exceeded'?400:503).end(JSON.stringify({error:code}))}
}
