// Temporary, local-only CRM demonstration. Uses only new synthetic records.
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createServer as netServer} from 'node:net';
import {request as proxyRequest} from 'node:http';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';
import express from 'express';
import {openDatabase} from './database.mjs';
import {register,login} from './auth.mjs';
import {seedCatalog} from './catalog.mjs';
import {saveBoard,saveColumn,saveCard,saveField,savePrintTemplate,saveStaffShift} from './crm-work.mjs';

async function freePort(){const s=netServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(r=>s.close(r));return p}
if(process.env.PC_LEASE_CRM_WORK_TEST!=='1')throw Error('Explicit isolated test mode required');
const dist=resolve('tmp','crm-demo-build-'+randomBytes(6).toString('hex'));
const build=spawn(process.execPath,['node_modules/vite/bin/vite.js','build','--outDir',dist],{stdio:'ignore',env:{...process.env,VITE_CRM_WORK_TEST:'1'}});
const [buildCode]=await once(build,'exit');if(buildCode!==0)throw Error('Test build failed');
const dbPort=await freePort(),apiPort=await freePort(),frontPort=await freePort();
const dir=mkdtempSync(join(tmpdir(),'pclease-crm-demo-')),password=randomBytes(24).toString('hex');
const pg=new EmbeddedPostgres({databaseDir:join(dir,'db'),port:dbPort,user:'pclease_test',password,authMethod:'scram-sha-256',initdbFlags:['--encoding=UTF8'],persistent:true,postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
let db,api,front;
async function cleanup(){if(front)await new Promise(r=>front.close(r));if(api)api.kill();if(db)await db.end();await pg.stop()}
try{
 await pg.initialise();await pg.start();
 const url=`postgresql://pclease_test:${password}@127.0.0.1:${dbPort}/postgres`;
 db=await openDatabase(url);await seedCatalog(db);
 const pass=randomBytes(24).toString('hex');const admin=await register(db,'demo-admin@example.invalid',pass,'admin');
 const account=await login(db,'demo-admin@example.invalid',pass);const user={id:admin.id,role:'admin',permissions:[]};
 const board=await saveBoard(db,user,{name:'דוגמה — לוח לקוחות'});
 const incoming=await saveColumn(db,user,{boardId:board.id,name:'חדש',color:'blue'});
 const progress=await saveColumn(db,user,{boardId:board.id,name:'בטיפול',color:'cyan'});
 const quote=await saveColumn(db,user,{boardId:board.id,name:'הצעת מחיר',color:'violet'});
 const waiting=await saveColumn(db,user,{boardId:board.id,name:'ממתין ללקוח',color:'amber'});
 const closed=await saveColumn(db,user,{boardId:board.id,name:'הושלם',color:'green'});
 const field=await saveField(db,user,{boardId:board.id,internalName:'priority',displayName:'עדיפות',fieldType:'select',options:['רגילה','גבוהה'],visible:true,showOnPreview:true});
 await saveCard(db,user,{boardId:board.id,columnId:incoming.id,title:'לקוח לדוגמה — מחשבים לצוות',description:'נתונים פיקטיביים לצורך הדגמה בלבד',customData:{priority:'גבוהה'}});
 await saveCard(db,user,{boardId:board.id,columnId:progress.id,title:'הצעה לדוגמה — מחשבים ניידים',description:'ניתן לערוך, להעביר או לארכב את הכרטיס',customData:{priority:'רגילה'}});
 await saveCard(db,user,{boardId:board.id,columnId:incoming.id,title:'פנייה לדוגמה — ציוד למשרד',description:'חברה לדוגמה · נתונים פיקטיביים',customData:{priority:'רגילה'}});
 await saveCard(db,user,{boardId:board.id,columnId:quote.id,title:'חידוש מחשבים לצוות',description:'פרטי הצעה לדוגמה',customData:{priority:'גבוהה'}});
 await saveCard(db,user,{boardId:board.id,columnId:waiting.id,title:'בחירת מסלול ליסינג',description:'ממתין למענה · נתונים פיקטיביים',customData:{priority:'רגילה'}});
 await savePrintTemplate(db,user,{boardId:board.id,name:'טופס הדגמה',title:'פרטי כרטיס לדוגמה',fieldIds:[field.id],includeDescription:true,showLogo:true,showCompanyDetails:true,companyDetails:'PC Lease — נתוני הדגמה',showCardMetadata:true,enabled:true,isDefault:true});
 const date=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});
 await saveStaffShift(db,user,{userId:user.id,date,start:'09:00',end:'17:00',role:'משמרת לדוגמה',location:'משרד לדוגמה',notes:'נתונים פיקטיביים'});
 const env={...process.env,PC_LEASE_DATABASE_URL:url,PC_LEASE_SERVER_PORT:String(apiPort),PC_LEASE_CRM_WORK_TEST:'1'};delete env.PC_LEASE_MAIL_USER;delete env.PC_LEASE_MAIL_APP_PASSWORD;
 api=spawn(process.execPath,['server/index.mjs'],{env,stdio:['ignore','pipe','pipe']});await Promise.race([once(api.stdout,'data'),once(api,'exit').then(()=>{throw Error('Test API failed to start')})]);
 const app=express();
 // Browsers share cookies across localhost ports. Keep the synthetic token only
 // inside the demo proxy so opening this preview never overwrites a real session.
 app.use('/api',(req,res)=>{const headers={...req.headers,cookie:`pclease_session=${account.token}`};if(headers.origin===`http://127.0.0.1:${frontPort}`)headers.origin='http://127.0.0.1:3000';const pr=proxyRequest({hostname:'127.0.0.1',port:apiPort,path:'/api'+req.url,method:req.method,headers},up=>{const responseHeaders={...up.headers};delete responseHeaders['set-cookie'];res.writeHead(up.statusCode,responseHeaders);up.pipe(res)});pr.on('error',()=>{if(!res.headersSent)res.status(502).end()});req.pipe(pr)});
 app.get('/',(req,res)=>{const html=readFileSync(join(dist,'index.html'),'utf8').replace('<body>','<body><div style="position:fixed;z-index:99999;bottom:0;left:0;right:0;background:#13295a;color:white;text-align:center;padding:5px;font:14px sans-serif">סביבת הדגמה מקומית · נתונים פיקטיביים בלבד · לא האתר הפעיל</div>');res.type('html').send(html)});
 app.use(express.static(dist));front=app.listen(frontPort,'127.0.0.1');await once(front,'listening');
 console.log(`CRM_DEMO_URL=http://127.0.0.1:${frontPort}/`);
 process.on('SIGINT',()=>void cleanup().then(()=>process.exit(0)));process.on('SIGTERM',()=>void cleanup().then(()=>process.exit(0)));
}catch(e){await cleanup().catch(()=>{});throw e}
