import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {requireTransactionPermission} from './transaction-permissions.mjs';
const idOk=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export async function uploadProductMedia(db,actor,input,permission){
 if(!input||typeof input.data!=='string'||input.data.length>5592408||input.data.length<4||input.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(input.data))throw Error('invalid_image');
 const bytes=Buffer.from(input.data,'base64');if(bytes.length>4194304||bytes.length===0||bytes.toString('base64')!==input.data)throw Error('invalid_image');
 let output;try{const image=sharp(bytes,{limitInputPixels:25000000,failOn:'error',animated:false});const meta=await image.metadata();if(!['jpeg','png','webp'].includes(meta.format)||!meta.width||!meta.height||(meta.pages||1)>1)throw Error();output=await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();if(output.length>4194304)throw Error();}catch{throw Error('invalid_image');}
 if(!['catalog','content'].includes(permission))throw Error('forbidden');
 const id=randomUUID(),client=await db.connect();try{await client.query('BEGIN');await requireTransactionPermission(client,actor,permission);await client.query('INSERT INTO product_media(id,data,created_by) VALUES($1,$2,$3)',[id,output,actor]);await client.query('COMMIT');return {path:`/api/media/${id}`};}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function readProductMedia(db,id,access={}){
 if(!idOk(id))throw Error('not_found');const result=await db.query(`SELECT m.data FROM product_media m WHERE m.id=$1 AND (
  $2::boolean OR (m.created_by=$3 AND ($4::boolean OR $5::boolean))
  OR EXISTS(SELECT 1 FROM products p WHERE p.details_json->>'imagePath'='/api/media/'||m.id AND ($4::boolean OR (p.published=true AND p.details_json->>'imageVerified'='true')))
  OR EXISTS(SELECT 1 FROM site_blocks b WHERE b.block_key IN ('hero','about','workspace') AND b.content->>'imageUrl'='/api/media/'||m.id AND ($5::boolean OR b.content->>'visible'='true'))
 )`,[id,access.admin===true,access.userId||null,access.catalog===true,access.content===true]);if(!result.rowCount)throw Error('not_found');return result.rows[0].data;
}
