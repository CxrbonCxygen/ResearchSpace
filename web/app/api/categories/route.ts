import {getWorkspaceUser} from '../../../lib/account';
import {readState,writeState} from '../../../lib/store';
import {addTaskCategory,retireTaskCategory} from '../../../lib/model';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function change(request:Request,remove:boolean){
 const user=await getWorkspaceUser(request);if(!user)return json({error:'请先登录'},401);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'请求来源无效'},403);
 let body:any;try{const raw=await request.text();if(raw.length>2000)throw new Error();body=JSON.parse(raw);}catch{return json({error:'分类格式有误'},400);}
 if(!Number.isSafeInteger(body.revision))return json({error:'缺少记录版本，请刷新'},400);
 try{
  const {state,revision}=await readState(user.userId);if(body.revision!==revision)return json({error:'另一设备已更新，请重新读取后再试'},409);
  let moved=0;if(remove){if(typeof body.id!=='string')return json({error:'缺少分类'},400);moved=retireTaskCategory(state,body.id);}else{if(typeof body.name!=='string')return json({error:'请填写分类名称'},400);addTaskCategory(state,body.name);}
  if(!await writeState(user.userId,state,revision))return json({error:'记录刚刚更新，请重新读取后再试'},409);
  return json({state,revision:revision+1,moved});
 }catch(e){return json({error:(e as Error).message||'分类保存失败'},400);}
}
export const POST=(request:Request)=>change(request,false);
export const DELETE=(request:Request)=>change(request,true);
