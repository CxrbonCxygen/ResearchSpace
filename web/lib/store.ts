import { env } from 'cloudflare:workers';
import { seed, State,normalizeState } from './model';
import {installFoundationCards} from './foundation-cards';
import {listTraining} from './training-store';
import {syncRealProject,preserveRealProjectMetadata} from './real-projects';
type Row={payload:string,revision:number};
export async function readState(userId:string){
 const db=env.DB!;
 for(let attempt=0;attempt<4;attempt++){
  let row=await db.prepare('SELECT payload,revision FROM research_workspaces WHERE user_id=?').bind(userId).first<Row>();
  if(!row){await db.prepare('INSERT OR IGNORE INTO research_workspaces(user_id,payload,revision,updated) VALUES(?,?,0,?)').bind(userId,JSON.stringify(seed()),new Date().toISOString()).run();continue;}
  const state=normalizeState(JSON.parse(row.payload));
  const cardsChanged=installFoundationCards(state);
  const runs=await listTraining(userId);
  const lastLoss=await db.prepare("SELECT value FROM research_training_points WHERE user_id=? AND run_key=? AND metric='loss' ORDER BY step DESC LIMIT 1").bind(userId,'gsm8k-full-titan-20261022-224748').first<{value:number}>();
  const projectChanged=syncRealProject(state,runs,lastLoss?.value??null);
  if(!cardsChanged&&!projectChanged)return {state,revision:row.revision};
  if(await writeState(userId,state,row.revision))return {state,revision:row.revision+1};
 }
 throw new Error('Workspace is being updated; please retry');
}
// Preserve installation metadata when an older APK writes without the new field.
export async function writeState(userId:string,state:State,revision:number){
 const previous=await env.DB!.prepare('SELECT payload FROM research_workspaces WHERE user_id=? AND revision=?').bind(userId,revision).first<{payload:string}>();
 if(!previous)return false;
 preserveRealProjectMetadata(state,normalizeState(JSON.parse(previous.payload)));
 const r=await env.DB!.prepare("UPDATE research_workspaces SET payload=json_set(?,'$.knowledgeVersion',MAX(COALESCE(json_extract(payload,'$.knowledgeVersion'),0),?),'$.realProjectsVersion',MAX(COALESCE(json_extract(payload,'$.realProjectsVersion'),0),?)),revision=revision+1,updated=? WHERE user_id=? AND revision=?").bind(JSON.stringify(state),state.knowledgeVersion,state.realProjectsVersion,new Date().toISOString(),userId,revision).run();return r.meta.changes===1;}
export async function digest(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');}
