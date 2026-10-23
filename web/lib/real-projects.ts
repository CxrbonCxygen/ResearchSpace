import type {State,Experiment} from './model.ts';
import type {TrainingRun} from './training-model.ts';

export const gsmRunKey='gsm8k-full-titan-20261022-224748';
export const evaluationDataset=(length:number)=>`GSM8K · L${length}`;

// Older installed APKs strip fields they do not know when saving unrelated tasks.
export function preserveRealProjectMetadata(next:State,previous:State){
 next.realProjectsVersion=Math.max(next.realProjectsVersion,previous.realProjectsVersion);
 for(const p of next.projects){const old=previous.projects.find(x=>x.id===p.id);if(!old)continue;
  if(old.archived&&p.archived===undefined)p.archived=true;
  if(old.trainingSource&&!p.trainingSource)Object.assign(p,old);
 }
 for(const e of next.experiments){const old=previous.experiments.find(x=>x.id===e.id);if(old?.trainingRunKey&&!e.trainingRunKey)Object.assign(e,old);}
}

// Only measured runs owned by this workspace can replace its demonstration projects.
// Archive demonstrations in the exported state; retain tasks, cards and their links.
export function syncRealProject(state:State,runs:TrainingRun[],loss:number|null=null):boolean{
 const run=runs.find(r=>r.runKey===gsmRunKey);
 const base=run?.evaluations.find(e=>e.name==='base-256'&&e.length===256);
 if(!run||!base)return false;
 const before=JSON.stringify(state);
 let project=state.projects.find(p=>p.trainingSource===run.runKey);
 if(!project){
  const original=state.projects.find(p=>p.id==='dllm');
  const id=!original||original.demo?'dllm':'gsm8k-real';
  project={id,name:'d-OPSD · GSM8K',subtitle:'LLaDA 自蒸馏 · 双卡 TITAN · 500 Step',stage:'实验阶段',
   question:'复现 d-OPSD 在 GSM8K 上的自蒸馏实验，比较相同生成长度下基线与各训练 checkpoint 的数学推理准确率。',
   datasets:[evaluationDataset(256),evaluationDataset(512)],metric:'Accuracy (%)',direction:'higher',baseline:base.accuracy*100,sota:null,target:null,
   method:'d-OPSD · Self-future Distillation',github:'',path:run.logPath,
   references:'真实运行：'+run.runKey+'\n数据来源：服务器训练日志、checkpoint trainer_state.json、完整评测 summary.json。\n训练已完成 500 Step；各 checkpoint 评测独立进行。\n评测条件按生成长度分开：L256 与 L512 各 1319 题。基线不代表蒸馏后的结果；未完成的评测不填准确率。\n硬件：双卡 TITAN，单卡 24 GB。未填写未经核实的 SOTA 或目标值。',
   color:'blue',demo:false,trainingSource:run.runKey};
  const at=state.projects.findIndex(p=>p.id===id);
  if(at<0)state.projects.unshift(project);else state.projects[at]=project;
 }
 if(!state.realProjectsVersion){
  for(const p of state.projects)if(p.demo&&!state.experiments.some(e=>e.projectId===p.id&&!e.demo))p.archived=true;
  state.realProjectsVersion=1;
 }
 for(const e of run.evaluations){
  const dataset=evaluationDataset(e.length);if(!project.datasets.includes(dataset))project.datasets.push(dataset);
  const baseline=e.name.startsWith('base-');
  const id='training:'+run.runKey+':'+e.name;
  const existing=state.experiments.find(e=>e.id===id);
  const record:Experiment={id,projectId:project.id,name:e.name,method:baseline?'Baseline':'d-OPSD',dataset,value:e.accuracy*100,status:'completed',epoch:0,totalEpoch:0,loss:null,valLoss:null,gpu:null,
   notes:`来源：${run.logPath}/${e.name}/summary.json\n生成长度 ${e.length}；正确 ${e.correct} / ${e.samples}；耗时 ${(e.seconds/3600).toFixed(2)} 小时。`+(baseline?'\n这是蒸馏前基线，不是训练 checkpoint 的成绩。':''),
   updated:existing?.updated??run.observedAt,demo:false,trainingRunKey:run.runKey,progressUnit:'Step'};
  if(existing)Object.assign(existing,record);else state.experiments.push(record);
 }
 const id='training:'+run.runKey+':progress';
 const record:Experiment={id,projectId:project.id,name:run.name,method:'d-OPSD · '+(run.stage||run.status),dataset:evaluationDataset(Number(run.stage.match(/-(256|512)$/)?.[1]??256)),
  value:null,status:run.status==='failed'?'failed':run.status==='stopped'?'queued':run.status==='completed'?'completed':'running',epoch:run.currentStep,totalEpoch:run.maxSteps,loss,valLoss:null,gpu:run.gpus[0]?.utilization??null,
  notes:'训练与评测进度；准确率只从完整评测记录读取。\n'+run.logPath,updated:run.observedAt,demo:false,trainingRunKey:run.runKey,progressUnit:'Step',phase:run.status==='evaluating'?'评测中':run.status==='running'?'训练中':run.status==='completed'?'已完成':run.status==='failed'?'失败':'已停止'};
 const existing=state.experiments.find(e=>e.id===id);if(existing)Object.assign(existing,record);else state.experiments.push(record);
 return JSON.stringify(state)!==before;
}
