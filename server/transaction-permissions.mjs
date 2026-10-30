import {AsyncLocalStorage} from 'node:async_hooks';
import {createHash} from 'node:crypto';

const requestSession=new AsyncLocalStorage();
export function withRequestSession(token,callback){
 const hash=typeof token==='string'&&/^[a-f0-9]{64}$/.test(token)?createHash('sha256').update(token).digest('hex'):null;
 return requestSession.run({hash},callback);
}
export async function requireLiveSession(client,actor){
 const context=requestSession.getStore();
 // Non-HTTP callers such as maintenance scripts perform their own authentication.
 if(!context)return;
 if(!context.hash||!(await client.query('SELECT 1 FROM auth_sessions WHERE token_hash=$1 AND user_id=$2 FOR SHARE',[context.hash,actor])).rowCount)throw Error('forbidden');
 if(!(await client.query('SELECT 1 FROM auth_sessions WHERE token_hash=$1 AND user_id=$2 AND expires_at>clock_timestamp()',[context.hash,actor])).rowCount)throw Error('forbidden');
}
export async function requireTransactionUser(client,actor){
 const user=(await client.query('SELECT active FROM users WHERE id=$1 FOR UPDATE',[actor])).rows[0];
 if(!user?.active)throw Error('forbidden');
 await requireLiveSession(client,actor);
}
// The user and session row locks serialize writes with access changes and logout.
export async function requireTransactionPermission(client, actor, permission) {
 const user=(await client.query('SELECT role,active FROM users WHERE id=$1 FOR SHARE',[actor])).rows[0];
 if(!user?.active)throw Error('forbidden');
 await requireLiveSession(client,actor);
 const permissions=(await client.query('SELECT permission FROM staff_permissions WHERE user_id=$1 UNION SELECT unnest(r.permissions) AS permission FROM access_roles r JOIN access_role_assignments a ON a.role_id=r.id WHERE a.user_id=$1',[actor])).rows.map(row=>row.permission);
 if(user.role!=='admin'&&!permissions.includes(permission))throw Error('forbidden');
 return {userId:actor,admin:user.role==='admin',catalog:permissions.includes('catalog'),content:permissions.includes('content')};
}

export async function requireTransactionAdmin(client, actor) {
 const user=(await client.query('SELECT role,active FROM users WHERE id=$1 FOR SHARE',[actor])).rows[0];
 if(!user?.active||user.role!=='admin')throw Error('forbidden');
 await requireLiveSession(client,actor);
}
