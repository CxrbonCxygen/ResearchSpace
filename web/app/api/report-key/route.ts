import { env } from 'cloudflare:workers';
import {getWorkspaceUser} from '../../../lib/account';
import { digest } from '../../../lib/store';
export async function POST(request:Request){
const user=await getWorkspaceUser(request);if(!user)return Response.json({error:'请先登录'},{status:401});if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'请求来源无效'},{status:403});
const token='rs_'+crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
await env.DB!.batch([env.DB!.prepare('DELETE FROM research_report_keys WHERE user_id=?').bind(user.userId),env.DB!.prepare('INSERT INTO research_report_keys(hash,user_id,created) VALUES(?,?,?)').bind(await digest(token),user.userId,new Date().toISOString())]);
return Response.json({token},{headers:{'Cache-Control':'no-store'}});}
