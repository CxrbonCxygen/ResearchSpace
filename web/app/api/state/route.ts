import {getWorkspaceUser,reply,preflight,allowedOrigin} from '../../../lib/account';
import { readState,writeState } from '../../../lib/store';
import { stateSchema,normalizeState } from '../../../lib/model';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export const OPTIONS=preflight;
export async function GET(request:Request){const user=await getWorkspaceUser(request);if(!user)return reply(request,{error:'请先登录'},401);try{return reply(request,await readState(user.userId));}catch(e){console.error('Read workspace',e);return reply(request,{error:'云端暂时无法读取，请稍后重试'},503);}}
export async function PUT(request:Request){
 const user=await getWorkspaceUser(request);if(!user)return reply(request,{error:'请先登录'},401);
 if(!allowedOrigin(request))return reply(request,{error:'请求来源无效'},403);
 try{const raw=await request.text();if(raw.length>1800000)return reply(request,{error:'记录过大，请先导出归档'},413);const body=JSON.parse(raw),parsed=stateSchema.safeParse(body.state);if(!parsed.success||!Number.isSafeInteger(body.revision)||body.revision<0)return reply(request,{error:'记录格式有误'},400);if(!await writeState(user.userId,normalizeState(parsed.data),body.revision))return reply(request,{error:'另一设备已更新记录，请刷新后再试'},409);return reply(request,{revision:body.revision+1});}catch(e){console.error('Write workspace',e);return reply(request,{error:'保存失败，请重试'},503);}
}
