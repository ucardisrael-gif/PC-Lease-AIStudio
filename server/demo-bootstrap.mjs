// Initialise only a dedicated, empty demo database. Never use local business data.
import pg from 'pg';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {openDatabase} from './database.mjs';
import {seedCatalog} from './catalog.mjs';
import {register} from './auth.mjs';
import {saveBoard,saveColumn,saveCard,saveField,savePrintTemplate} from './crm-work.mjs';

export async function initialiseDemo({url, email, password, enabled}) {
  if (enabled !== '1' || !url || new URL(url).pathname !== '/pclease_demo') throw Error('Dedicated pclease_demo database and explicit demo mode required');
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 20 || password.length > 128) throw Error('Valid demo credentials required');
  if (process.env.PC_LEASE_CRM_WORK_ENABLED !== '1') throw Error('CRM must be enabled for the demonstration');
  const pool = new pg.Pool({connectionString:url, max:1});
  let lock;
  try {
    lock = await pool.connect();
    await lock.query('SELECT pg_advisory_lock($1)', [68499297]);
    const tables = await lock.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    if (tables.rows.some(r => r.tablename === 'pclease_demo_ready')) {
      const ready = await lock.query('SELECT ready FROM pclease_demo_ready');
      if (ready.rowCount === 1 && ready.rows[0].ready === true) return 'already initialised';
      throw Error('Incomplete demonstration database; manual investigation required');
    }
    if (tables.rowCount) throw Error('Database is not empty; refusing to initialise');
    // A failure leaves a nonempty database, which is rejected on the next run.
    const db = await openDatabase(url);
    try {
      await seedCatalog(db);
      const admin = await register(db,email,password,'admin');
      const user = {id:admin.id,role:'admin',permissions:[]};
      const board = await saveBoard(db,user,{name:'דוגמה — לוח לקוחות'});
      const columns = [];
      for (const [name,color] of [['חדש','blue'],['בטיפול','cyan'],['הצעת מחיר','violet'],['ממתין ללקוח','amber'],['הושלם','green']]) columns.push(await saveColumn(db,user,{boardId:board.id,name,color}));
      const field = await saveField(db,user,{boardId:board.id,internalName:'priority',displayName:'עדיפות',fieldType:'select',options:['רגילה','גבוהה'],visible:true,showOnPreview:true});
      for (const [column,title,priority] of [[0,'לקוח לדוגמה — מחשבים לצוות','גבוהה'],[1,'הצעה לדוגמה — מחשבים ניידים','רגילה'],[2,'חידוש מחשבים לצוות','גבוהה'],[3,'בחירת מסלול ליסינג','רגילה']]) await saveCard(db,user,{boardId:board.id,columnId:columns[column].id,title,description:'נתונים פיקטיביים לצורך הדגמה בלבד',customData:{priority}});
      await savePrintTemplate(db,user,{boardId:board.id,name:'טופס הדגמה',title:'פרטי כרטיס לדוגמה',fieldIds:[field.id],includeDescription:true,showLogo:true,enabled:true,isDefault:true});
      await db.query('CREATE TABLE pclease_demo_ready (ready boolean NOT NULL CHECK (ready))');
      await db.query('INSERT INTO pclease_demo_ready(ready) VALUES(true)');
    } finally { await db.end(); }
    return 'initialised';
  } finally {
    if (lock) { await lock.query('SELECT pg_advisory_unlock($1)', [68499297]).catch(()=>{}); lock.release(); }
    await pool.end();
  }
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  try { console.log(await initialiseDemo({url:process.env.PC_LEASE_DATABASE_URL,email:process.env.PC_LEASE_DEMO_EMAIL,password:process.env.PC_LEASE_DEMO_PASSWORD,enabled:process.env.PC_LEASE_DEMO_BOOTSTRAP})); }
  catch (error) { console.error('Demo initialization failed:',error.message); process.exitCode=1; }
}
