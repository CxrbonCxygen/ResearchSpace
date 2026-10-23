import {env} from 'cloudflare:workers';
import {splitTraining,type TrainingSnapshot,type TrainingRun,type TrainingPoint} from './training-model';
export async function ingestTraining(userId:string,snapshot:TrainingSnapshot){
 const {meta,points}=splitTraining(snapshot);const now=new Date().toISOString();
 await env.DB!.batch([
  env.DB!.prepare('INSERT INTO research_training_runs(user_id,run_key,payload,observed_at,received_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,run_key) DO UPDATE SET payload=excluded.payload,observed_at=excluded.observed_at,received_at=excluded.received_at WHERE julianday(excluded.observed_at)>=julianday(research_training_runs.observed_at)').bind(userId,meta.runKey,JSON.stringify(meta),meta.observedAt,now),
  env.DB!.prepare("INSERT INTO research_training_points(user_id,run_key,step,metric,value) SELECT ?,?,json_extract(value,'$.step'),json_extract(value,'$.metric'),json_extract(value,'$.value') FROM json_each(?) WHERE 1 ON CONFLICT(user_id,run_key,step,metric) DO NOTHING").bind(userId,meta.runKey,JSON.stringify(points)),
 ]);
 return {ok:true,runKey:meta.runKey,accepted:points.length};
}
export async function listTraining(userId:string){const rows=await env.DB!.prepare('SELECT r.payload,r.received_at,(SELECT COUNT(*) FROM research_training_points p WHERE p.user_id=r.user_id AND p.run_key=r.run_key) AS point_count FROM research_training_runs r WHERE r.user_id=? ORDER BY r.observed_at DESC LIMIT 100').bind(userId).all<{payload:string,received_at:string,point_count:number}>();return rows.results.map(r=>({...JSON.parse(r.payload),receivedAt:r.received_at,pointCount:r.point_count})) as TrainingRun[];}
export async function trainingPoints(userId:string,key:string){const r=await env.DB!.prepare('SELECT step,metric,value FROM research_training_points WHERE user_id=? AND run_key=? ORDER BY step,metric LIMIT 100000').bind(userId,key).all<TrainingPoint>();return r.results;}
