import {cp, lstat, mkdir, open, readFile, readdir, realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {join,resolve,relative,isAbsolute,dirname,basename,sep} from 'node:path';

async function digest(path){const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
async function compare(source,target){
 for(const name of await readdir(source)){const src=join(source,name),dst=join(target,name),stat=await lstat(src);
  if(stat.isSymbolicLink())throw Error('symbolic links are not supported');
  if(stat.isDirectory())await compare(src,dst);
  else if(stat.isFile()){if(await digest(src)!==await digest(dst))throw Error('backup verification failed');}
  else throw Error('unsupported file in cluster');
 }
}
export async function backupStoppedCluster(source,target){
 source=await realpath(resolve(source));target=resolve(target);
 const actualTarget=join(await realpath(dirname(target)),basename(target));const rel=relative(source,actualTarget);
 if(!rel||(!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith(`..${sep}`)))throw Error('backup must be outside the cluster');
 const version=(await readFile(join(source,'PG_VERSION'),'utf8')).trim();if(!/^\d+$/.test(version))throw Error('invalid cluster');
 try{await open(join(source,'postmaster.pid'),'r').then(f=>f.close());throw Error('cluster may be running');}catch(e){if(e.code!=='ENOENT')throw e;}
 await mkdir(target,{recursive:false});
 for(const name of await readdir(source))await cp(join(source,name),join(target,name),{recursive:true,errorOnExist:true,force:false,filter:async path=>{if((await lstat(path)).isSymbolicLink())throw Error('symbolic links are not supported');return true;}});
 try{await open(join(source,'postmaster.pid'),'r').then(f=>f.close());throw Error('cluster started during backup');}catch(e){if(e.code!=='ENOENT')throw e;}
 await compare(source,target);return {version};
}
