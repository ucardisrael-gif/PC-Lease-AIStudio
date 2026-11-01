// Separate Render demonstration only. This proxy protects the entire demo.
import {createServer, request} from 'node:http';
import {createServer as createTcpServer} from 'node:net';
import {spawn} from 'node:child_process';
import {timingSafeEqual, createHash} from 'node:crypto';
import {once} from 'node:events';
import {initialiseDemo} from './demo-bootstrap.mjs';

const env=process.env;
const origin=env.RENDER_EXTERNAL_URL || env.PC_LEASE_PUBLIC_ORIGIN;
const port=Number(env.PORT);
if(env.PC_LEASE_DEMO_BOOTSTRAP!=='1'||env.PC_LEASE_CRM_WORK_ENABLED!=='1'||!origin||!Number.isInteger(port)||port<1||port>65535) throw Error('Demo settings are incomplete');
if(!env.PC_LEASE_DEMO_GATE_PASSWORD||env.PC_LEASE_DEMO_GATE_PASSWORD.length<20) throw Error('Demo access password must be at least 20 characters');
if(env.PC_LEASE_MAIL_USER||env.PC_LEASE_MAIL_APP_PASSWORD) throw Error('Email sending must be disabled for the demo');
await initialiseDemo({url:env.PC_LEASE_DATABASE_URL,email:env.PC_LEASE_DEMO_EMAIL,password:env.PC_LEASE_DEMO_PASSWORD,enabled:env.PC_LEASE_DEMO_BOOTSTRAP});
const probe=createTcpServer().listen(0,'127.0.0.1'); await once(probe,'listening');
const internalPort=probe.address().port; await new Promise(r=>probe.close(r));
const child=spawn(process.execPath,['server/index.mjs'],{env:{...env,PC_LEASE_HOSTED:'true',PC_LEASE_PUBLIC_ORIGIN:origin,PORT:String(internalPort)},stdio:'inherit'});
const hash=value=>createHash('sha256').update(value).digest();
const expected=hash(`demo:${env.PC_LEASE_DEMO_GATE_PASSWORD}`);
const server=createServer((req,res)=>{
  const health=req.url==='/health' && req.method==='GET';
  const header=req.headers.authorization || '';
  let supplied='';
  if(header.startsWith('Basic ')&&header.length<1024){try{supplied=Buffer.from(header.slice(6),'base64').toString('utf8')}catch{}}
  if(!health && !timingSafeEqual(hash(supplied),expected)){res.writeHead(401,{'WWW-Authenticate':'Basic realm="PC-Lease demonstration", charset="UTF-8"','Cache-Control':'no-store'});res.end('Authentication required');return;}
  const headers={...req.headers}; delete headers.authorization;
  const upstream=request({hostname:'127.0.0.1',port:internalPort,path:req.url,method:req.method,headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res)});
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503);res.end()});
  req.pipe(upstream);
});
child.on('exit',()=>server.close(()=>process.exitCode=1));
process.on('SIGTERM',()=>{server.close();child.kill('SIGTERM')});
server.listen(port,'0.0.0.0');
