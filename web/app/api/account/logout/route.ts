import {env} from 'cloudflare:workers';
import {allowedOrigin,reply,preflight} from '../../../../lib/account';
import {tokenHash} from '../../../../lib/password';
export const OPTIONS=preflight;
export async function POST(request:Request){if(!allowedOrigin(request))return reply(request,{error:'请求来源无效'},403);const token=request.headers.get('authorization')?.replace(/^Bearer /,'')??request.headers.get('cookie')?.match(/(?:^|;\s*)rs_session=([a-f0-9]{64})/)?.[1];if(token)await env.DB!.prepare('DELETE FROM research_sessions WHERE hash=?').bind(await tokenHash(token)).run();return reply(request,{ok:true},200,{'Set-Cookie':'rs_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});}
