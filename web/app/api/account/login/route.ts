import {env} from 'cloudflare:workers';
import {ownerAccount,allowedOrigin,reply,issueSession,preflight} from '../../../../lib/account';
import {accountInput,passwordHash,tokenHash,equalSecret} from '../../../../lib/password';
export const OPTIONS=preflight;
export async function POST(request:Request){
 if(!allowedOrigin(request))return reply(request,{error:'请求来源无效'},403);
 const key=await tokenHash((request.headers.get('cf-connecting-ip')??'shared')+':login');const now=Date.now();
 const rate=await env.DB!.prepare('INSERT INTO research_login_limits(key,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<? THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END RETURNING attempts,reset_at').bind(key,now+900000,now,now).first<{attempts:number,reset_at:number}>();
 if(!rate||rate.attempts>5)return reply(request,{error:'尝试次数过多，请 15 分钟后再试'},429);
 try{const raw=await request.text();if(raw.length>2000)return reply(request,{error:'输入过长'},413);const {username,password}=accountInput(JSON.parse(raw)),account=await ownerAccount();if(!account)return reply(request,{error:'请先由空间所有者在网页版设置独立账号'},409);const hash=await passwordHash(password,account.salt);if(username!==account.username||!equalSecret(hash,account.password_hash))return reply(request,{error:'用户名或密码不正确'},401);await env.DB!.prepare('DELETE FROM research_login_limits WHERE key=?').bind(key).run();return issueSession(request,account);}catch{return reply(request,{error:'用户名或密码不正确'},401);}
}
