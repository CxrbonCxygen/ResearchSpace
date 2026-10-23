import {env} from 'cloudflare:workers';
import {headers} from 'next/headers';
import {getChatGPTUser} from '../app/chatgpt-auth';
import {tokenHash,randomSecret} from './password';
export type Account={id:string,user_id:string,username:string,password_hash:string,salt:string};
export const mobileOrigin='https://appassets.androidplatform.net';
export async function ownerAccount(){return env.DB!.prepare('SELECT * FROM research_accounts WHERE id=?').bind('owner').first<Account>();}
export function allowedOrigin(request:Request){const o=request.headers.get('origin');return o===new URL(request.url).origin||o===mobileOrigin;}
export function cors(request:Request):Record<string,string>{const o=request.headers.get('origin');return o===mobileOrigin?{'Access-Control-Allow-Origin':mobileOrigin,'Vary':'Origin'}:{};}
export function reply(request:Request,body:unknown,status=200,extra:Record<string,string>={}){return Response.json(body,{status,headers:{'Cache-Control':'no-store',...cors(request),...extra}});}
export function preflight(request:Request){return new Response(null,{status:request.headers.get('origin')===mobileOrigin?204:403,headers:{...cors(request),'Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Max-Age':'600'}});}
export async function getWorkspaceUser(request?:Request){
 const h=request?.headers??await headers();const bearer=h.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/i)?.[1];const cookie=h.get('cookie')?.match(/(?:^|;\s*)rs_session=([a-f0-9]{64})(?:;|$)/)?.[1];const token=bearer??cookie;
 if(token){const row=await env.DB!.prepare('SELECT a.user_id,a.username FROM research_sessions s JOIN research_accounts a ON a.id=s.account_id WHERE s.hash=? AND s.expires>?').bind(await tokenHash(token),Date.now()).first<{user_id:string,username:string}>();if(row)return {userId:row.user_id,displayName:row.username};}
 // The original owner can migrate while the Site is still private. Once an
 // independent account exists, only its own sessions authorize workspace data.
 if(!await ownerAccount())return getChatGPTUser();
 return null;
}
export async function issueSession(request:Request,account:Account){const token=randomSecret(),expires=Date.now()+30*86400000;await env.DB!.batch([env.DB!.prepare('DELETE FROM research_sessions WHERE expires<?').bind(Date.now()),env.DB!.prepare('INSERT INTO research_sessions(hash,account_id,expires) VALUES(?,?,?)').bind(await tokenHash(token),account.id,expires)]);return reply(request,{token,username:account.username,accountId:account.id,expires},200,{'Set-Cookie':`rs_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`});}
