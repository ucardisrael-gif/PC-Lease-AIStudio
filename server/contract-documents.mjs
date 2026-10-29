import {createHash} from 'node:crypto';
import {requireTransactionPermission} from './transaction-permissions.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
function verifyDocumentContents(row){if(!Buffer.isBuffer(row.contents)||typeof row.sha256!=='string'||createHash('sha256').update(row.contents).digest('hex')!==row.sha256)throw Error('document_integrity_failed');}
export async function addContractDocument(db,actor,input){
 if(!input||!uuid(input.id)||!uuid(input.contractId)||!Number.isSafeInteger(input.version)||input.version<1||typeof input.fileName!=='string'||!input.fileName.trim()||input.fileName.length>200||/[\u0000-\u001f\u007f/\\]/.test(input.fileName)||!input.fileName.toLowerCase().endsWith('.pdf')||typeof input.data!=='string'||input.data.length>6990508||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.data))throw Error('invalid_input');
 const kind=input.documentKind??'unspecified';if(!['unspecified','signed_copy','supporting'].includes(kind))throw Error('invalid_input');
 const bytes=Buffer.from(input.data,'base64');if(bytes.length<8||bytes.length>5242880||bytes.subarray(0,5).toString()!=='%PDF-'||!bytes.subarray(-1024).includes(Buffer.from('%%EOF')))throw Error('invalid_pdf');
 const hash=createHash('sha256').update(bytes).digest('hex'),c=await db.connect();
 try{await c.query('BEGIN');await requireTransactionPermission(c,actor,'contracts');await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[input.id]);
  const old=(await c.query('SELECT id,contract_id,version,file_name,sha256,uploaded_by,document_kind,contents FROM contract_documents WHERE id=$1',[input.id])).rows[0];
  if(old){if(old.contract_id!==input.contractId||old.version!==input.version||old.file_name!==input.fileName.trim()||old.sha256!==hash||old.uploaded_by!==actor||old.document_kind!==kind)throw Error('create_conflict');verifyDocumentContents(old);const {contents,...result}=old;await c.query('COMMIT');return result;}
  const version=(await c.query("SELECT 1 FROM contract_drafts d JOIN contract_draft_history h ON h.contract_id=d.id WHERE d.id=$1 AND h.new_data->>'version'=$2 FOR SHARE OF d",[input.contractId,String(input.version)])).rowCount;
  if(!version)throw Error('version_not_found');
  const row=(await c.query('INSERT INTO contract_documents(id,contract_id,version,file_name,sha256,contents,uploaded_by,document_kind) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,contract_id,version,file_name,sha256,document_kind,created_at',[input.id,input.contractId,input.version,input.fileName.trim(),hash,bytes,actor,kind])).rows[0];await c.query('COMMIT');return row;
 }catch(e){await c.query('ROLLBACK');if(e.code==='23505')throw Error('duplicate_document');throw e;}finally{c.release();}
}
export async function listContractDocuments(db,contractId,version,offset='0',before='',limitedHistory=false){
 if(!uuid(contractId)||!Number.isSafeInteger(version)||version<1||typeof offset!=='string'||!/^\d{1,7}$/.test(offset)||typeof before!=='string'||(before&&!uuid(before))||(before&&offset!=='0'))throw Error('invalid_input');
 if(!(await db.query("SELECT 1 FROM contract_drafts d JOIN contract_draft_history h ON h.contract_id=d.id WHERE d.id=$1 AND h.new_data->>'version'=$2",[contractId,String(version)])).rowCount)throw Error('version_not_found');
 if(before&&!(await db.query('SELECT 1 FROM contract_documents WHERE id=$1 AND contract_id=$2 AND version=$3',[before,contractId,version])).rowCount)throw Error('not_found');
 const rows=(await db.query(`SELECT d.id,d.file_name,d.sha256,COALESCE(latest.new_kind,d.document_kind) AS document_kind,COALESCE(latest.id::text,'0') AS kind_revision,d.created_at,u.email AS actor_email,COALESCE(hist.events,'[]'::json) AS kind_history FROM contract_documents d JOIN users u ON u.id=d.uploaded_by LEFT JOIN LATERAL (SELECT id,new_kind FROM contract_document_kind_history WHERE document_id=d.id ORDER BY id DESC LIMIT 1) latest ON true LEFT JOIN LATERAL (SELECT json_agg(json_build_object('id',h.id::text,'old_kind',h.old_kind,'new_kind',h.new_kind,'created_at',h.created_at,'actor_email',h.actor_email) ORDER BY h.id DESC) AS events FROM (SELECT h.id,h.old_kind,h.new_kind,h.created_at,a.email AS actor_email FROM contract_document_kind_history h JOIN users a ON a.id=h.actor_user_id WHERE h.document_id=d.id ORDER BY h.id DESC LIMIT $5) h) hist ON true WHERE d.contract_id=$1 AND d.version=$2 AND ($4::text='' OR (d.created_at,d.id)<((SELECT created_at FROM contract_documents WHERE id=$4),$4::text)) ORDER BY d.created_at DESC,d.id DESC LIMIT 26 OFFSET $3`,[contractId,version,Number(offset),before,limitedHistory?26:null])).rows;
 const documents=rows.slice(0,25).map(d=>limitedHistory?{...d,kind_history_has_more:d.kind_history.length>25,kind_history:d.kind_history.slice(0,25)}:d);
 return {documents,hasMore:rows.length>25,offset:Number(offset)};
}
export async function listDocumentKindHistory(db,documentId,before){
 if(!uuid(documentId)||typeof before!=='string'||!/^[1-9]\d{0,17}$/.test(before))throw Error('invalid_input');
 if(!(await db.query('SELECT 1 FROM contract_document_kind_history WHERE document_id=$1 AND id=$2::bigint',[documentId,before])).rowCount)throw Error('not_found');
 const rows=(await db.query('SELECT h.id::text,h.old_kind,h.new_kind,h.created_at,u.email AS actor_email FROM contract_document_kind_history h JOIN users u ON u.id=h.actor_user_id WHERE h.document_id=$1 AND h.id<$2::bigint ORDER BY h.id DESC LIMIT 26',[documentId,before])).rows;
 return {history:rows.slice(0,25),hasMore:rows.length>25};
}
export async function changeDocumentKind(db,actor,input){
 const kinds=['unspecified','signed_copy','supporting'];if(!input||!uuid(input.id)||!kinds.includes(input.expectedKind)||!kinds.includes(input.kind)||input.kind===input.expectedKind||typeof input.expectedRevision!=='string'||!/^(0|[1-9][0-9]{0,18})$/.test(input.expectedRevision))throw Error('invalid_input');
 const c=await db.connect();try{await c.query('BEGIN');await requireTransactionPermission(c,actor,'contracts');const row=(await c.query('SELECT document_kind FROM contract_documents WHERE id=$1 FOR UPDATE',[input.id])).rows[0];if(!row)throw Error('not_found');const history=(await c.query('SELECT id::text AS revision,new_kind FROM contract_document_kind_history WHERE document_id=$1 ORDER BY id DESC LIMIT 1',[input.id])).rows[0];const latest=history?.new_kind||row.document_kind;if(latest!==input.expectedKind||(history?.revision||'0')!==input.expectedRevision)throw Error('version_conflict');await c.query('INSERT INTO contract_document_kind_history(document_id,actor_user_id,old_kind,new_kind) VALUES($1,$2,$3,$4)',[input.id,actor,latest,input.kind]);await c.query('COMMIT');return{id:input.id,kind:input.kind};}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function readContractDocument(db,id){
 if(!uuid(id))throw Error('invalid_input');const row=(await db.query('SELECT contents,sha256 FROM contract_documents WHERE id=$1',[id])).rows[0];if(!row)throw Error('not_found');verifyDocumentContents(row);return row.contents;
}
export async function contractDocumentStatus(db,id,contractId,version){
 if(!uuid(id)||!uuid(contractId)||!Number.isSafeInteger(version)||version<1)throw Error('invalid_input');
 if(!(await db.query("SELECT 1 FROM contract_drafts d JOIN contract_draft_history h ON h.contract_id=d.id WHERE d.id=$1 AND h.new_data->>'version'=$2",[contractId,String(version)])).rowCount)throw Error('version_not_found');
 const row=(await db.query('SELECT id,file_name,sha256,created_at,contents FROM contract_documents WHERE id=$1 AND contract_id=$2 AND version=$3',[id,contractId,version])).rows[0];
 if(!row)throw Error('not_found');verifyDocumentContents(row);const {contents,...status}=row;return status;
}
