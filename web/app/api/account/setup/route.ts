import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {ownerAccount,allowedOrigin,reply,issueSession} from '../../../../lib/account';
import {accountInput,passwordHash,randomSecret} from '../../../../lib/password';
export async function GET(request:Request){return reply(request,{configured:!!await ownerAccount()});}
export async function POST(request:Request){
 if(!allowedOrigin(request)||request.headers.get('origin')!==new URL(request.url).origin)return reply(request,{error:'请求来源无效'},403);
 if(await ownerAccount())return reply(request,{error:'独立账号已经设置，请直接登录'},409);
 const legacy=await getChatGPTUser();if(!legacy)return reply(request,{error:'首次设置需要由原空间所有者在网页中完成'},403);
 const exists=await env.DB!.prepare('SELECT user_id FROM research_workspaces WHERE user_id=?').bind(legacy.userId).first();if(!exists)return reply(request,{error:'没有可迁移的原空间'},403);
 try{const text=await request.text();if(text.length>2000)return reply(request,{error:'输入过长'},413);const {username,password}=accountInput(JSON.parse(text)),salt=randomSecret(),hash=await passwordHash(password,salt);const r=await env.DB!.prepare('INSERT OR IGNORE INTO research_accounts(id,user_id,username,password_hash,salt,created) VALUES(?,?,?,?,?,?)').bind('owner',legacy.userId,username,hash,salt,Date.now()).run();if(!r.meta.changes)return reply(request,{error:'账号已在另一窗口设置'},409);return issueSession(request,(await ownerAccount())!);}catch{return reply(request,{error:'请使用 3–40 位英文用户名和至少 12 位密码'},400);}
}
