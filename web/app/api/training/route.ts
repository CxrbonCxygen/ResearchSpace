import {env} from 'cloudflare:workers';
import {getWorkspaceUser,allowedOrigin,reply} from '../../../lib/account';
import {randomSecret,tokenHash} from '../../../lib/password';
import {trainingSnapshotSchema} from '../../../lib/training-model';
import {ingestTraining,listTraining,trainingPoints} from '../../../lib/training-store';
export async function GET(request:Request){const user=await getWorkspaceUser(request);if(!user)return reply(request,{error:'请先登录'},401);const key=new URL(request.url).searchParams.get('run');return reply(request,key?{points:await trainingPoints(user.userId,key)}:{runs:await listTraining(user.userId)});}
export async function POST(request:Request){
 const user=await getWorkspaceUser(request);if(!user)return reply(request,{error:'请先登录'},401);if(!allowedOrigin(request))return reply(request,{error:'请求来源无效'},403);
 try{const raw=await request.text();if(raw.length>1500000)return reply(request,{error:'单次记录过大'},413);const body=JSON.parse(raw);
  if(body.action==='connection'){
   const runKey=String(body.runKey??'');const run=await env.DB!.prepare('SELECT run_key FROM research_training_runs WHERE user_id=? AND run_key=?').bind(user.userId,runKey).first();if(!run)return reply(request,{error:'请先导入这次实验'},404);
   const token='rst_'+randomSecret();await env.DB!.prepare('INSERT INTO research_training_keys(hash,user_id,run_key,created_at) VALUES(?,?,?,?)').bind(await tokenHash(token),user.userId,runKey,new Date().toISOString()).run();return reply(request,{token,runKey});
  }
  const snapshot=trainingSnapshotSchema.safeParse(body);if(!snapshot.success)return reply(request,{error:'实验记录格式不完整'},400);
  return reply(request,await ingestTraining(user.userId,snapshot.data));
 }catch{return reply(request,{error:'保存实验记录失败，请稍后重试'},503);}
}

export async function DELETE(request:Request){const user=await getWorkspaceUser(request);if(!user)return reply(request,{error:'请先登录'},401);if(!allowedOrigin(request))return reply(request,{error:'请求来源无效'},403);const key=new URL(request.url).searchParams.get('run');if(!key)return reply(request,{error:'请选择实验'},400);await env.DB!.prepare('DELETE FROM research_training_keys WHERE user_id=? AND run_key=?').bind(user.userId,key).run();return reply(request,{ok:true});}
