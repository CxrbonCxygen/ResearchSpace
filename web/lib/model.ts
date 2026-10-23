import {installFoundationCards} from './foundation-cards.ts';
import { z } from 'zod';
export const projectSchema=z.object({id:z.string().max(100),name:z.string().min(1).max(120),subtitle:z.string().max(200),stage:z.enum(['文献调研','复现阶段','实验阶段','论文写作','已完成']),question:z.string().max(2000),datasets:z.array(z.string().min(1).max(100)).min(1).max(30),metric:z.string().min(1).max(40),direction:z.enum(['lower','higher']),baseline:z.number().finite(),sota:z.number().finite().nullable(),target:z.number().finite().nullable(),method:z.string().max(200),github:z.string().max(500),path:z.string().max(500),references:z.string().max(3000),color:z.string().max(20),archived:z.boolean().optional(),trainingSource:z.string().max(150).optional(),demo:z.boolean().optional()});
export const experimentSchema=z.object({id:z.string().max(100),projectId:z.string().max(100),name:z.string().min(1).max(120),method:z.string().max(200),dataset:z.string().min(1).max(100),value:z.number().finite().nullable(),status:z.enum(['running','completed','failed','queued']),epoch:z.number().nonnegative(),totalEpoch:z.number().nonnegative(),loss:z.number().finite().nullable(),valLoss:z.number().finite().nullable(),gpu:z.number().min(0).max(100).nullable(),notes:z.string().max(3000),updated:z.string().max(100),trainingRunKey:z.string().max(150).optional(),progressUnit:z.enum(['Step','Epoch']).optional(),phase:z.string().max(30).optional(),demo:z.boolean().optional()});
export const cardSchema=z.object({id:z.string().max(100),title:z.string().min(1).max(120),english:z.string().max(120),topic:z.string().max(80),intuition:z.string().max(5000),formula:z.string().max(3000),example:z.string().max(5000),code:z.string().max(5000),application:z.string().max(3000),related:z.string().max(500),level:z.number().int().min(0).max(4),due:z.string().max(10),reviews:z.number().nonnegative(),projectId:z.string().max(100),demo:z.boolean().optional(),sources:z.array(z.object({title:z.string().max(200),url:z.string().url().refine(v=>v.startsWith('https://'))})).max(5).optional()});
const dateString=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const taskCategorySchema=z.object({id:z.string().min(1).max(100),name:z.string().trim().min(1).max(40),createdOn:dateString,retiredOn:dateString.nullable().default(null)});
export type TaskCategory=z.infer<typeof taskCategorySchema>;
export const categories=['英语','科研','课程','学校事务'] as const;
export const defaultTaskCategories=():TaskCategory[]=>categories.map((name,i)=>({id:'category-'+i,name,createdOn:'0000-01-01',retiredOn:null}));
export const taskSchema=z.object({id:z.string().max(100),title:z.string().min(1).max(200),category:z.string().trim().min(1).max(40),categoryId:z.string().max(100).default(''),status:z.enum(['todo','doing','done']),important:z.boolean(),date:dateString,projectId:z.string().max(100),cardId:z.string().max(100),demo:z.boolean().optional(),repeatId:z.string().max(64).optional(),skipped:z.boolean().optional()});
export function validDate(value:string){const d=new Date(value+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;}
export const repeatRuleSchema=taskSchema.omit({date:true,status:true,repeatId:true,skipped:true}).extend({id:z.string().min(1).max(64),frequency:z.enum(['daily','weekly']),weekdays:z.array(z.number().int().min(1).max(7)).min(1).max(7),startDate:dateString,endDate:dateString.nullable(),stoppedFrom:dateString.nullable().default(null)}).superRefine((r,ctx)=>{if(!validDate(r.startDate)||r.endDate&&(!validDate(r.endDate)||r.endDate<r.startDate)||r.stoppedFrom&&!validDate(r.stoppedFrom))ctx.addIssue({code:'custom',message:'重复日期区间无效'});});
export type RepeatRule=z.infer<typeof repeatRuleSchema>;
export const stateSchema=z.object({projects:z.array(projectSchema).max(200),experiments:z.array(experimentSchema).max(4000),cards:z.array(cardSchema).max(2000),tasks:z.array(taskSchema).max(4000),repeatRules:z.array(repeatRuleSchema).max(500).default(()=>[]),taskCategories:z.array(taskCategorySchema).max(500).default(defaultTaskCategories),realProjectsVersion:z.number().int().min(0).default(0),knowledgeVersion:z.number().int().min(0).max(10000).default(0),demo:z.boolean()});
export type Project=z.infer<typeof projectSchema>;export type Experiment=z.infer<typeof experimentSchema>;export type Card=z.infer<typeof cardSchema>;export type Task=z.infer<typeof taskSchema>;export type State=z.infer<typeof stateSchema>;
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const uid=()=>crypto.randomUUID();
export const topics=['数学基础','神经网络','训练方法','模型架构','大语言模型','扩散模型','信号与无线感知'];
export function emptyState():State{return {projects:[],experiments:[],cards:[],tasks:[],repeatRules:[],taskCategories:defaultTaskCategories(),realProjectsVersion:0,knowledgeVersion:0,demo:false};}
export function shiftDate(date:string,days:number){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function repeatMatches(rule:RepeatRule,date:string){if(!validDate(date)||date<rule.startDate||rule.endDate&&date>rule.endDate||rule.stoppedFrom&&date>=rule.stoppedFrom)return false;return rule.frequency==='daily'||rule.weekdays.includes(new Date(date+'T00:00:00Z').getUTCDay()||7);}
export function tasksForDate(state:State,date:string):Task[]{
 const snapshots=state.tasks.filter(t=>t.date===date);const result=snapshots.filter(t=>!t.skipped&&(!t.repeatId||!state.repeatRules.some(r=>r.id===t.repeatId&&r.stoppedFrom&&date>=r.stoppedFrom)));
 for(const rule of state.repeatRules){
  if(!repeatMatches(rule,date)||snapshots.some(t=>t.repeatId===rule.id||t.id==='repeat:'+rule.id+':'+date))continue;
  const category=state.taskCategories.find(c=>c.id===rule.categoryId&&c.createdOn<=date&&(!c.retiredOn||date<c.retiredOn));
  result.push({id:'repeat:'+rule.id+':'+date,title:rule.title,category:category?.name??'未分类',categoryId:category?.id??'uncategorized',important:rule.important,date,projectId:rule.projectId,cardId:rule.cardId,status:'todo',repeatId:rule.id,demo:rule.demo});
 }
 return result;
}
export function saveTaskOccurrence(state:State,task:Task){const index=state.tasks.findIndex(t=>t.id===task.id);if(index<0)state.tasks.push(task);else state.tasks[index]=task;}
export function skipTaskOccurrence(state:State,task:Task){if(task.repeatId)saveTaskOccurrence(state,{...task,skipped:true});else state.tasks=state.tasks.filter(t=>t.id!==task.id);}
export function createRepeatRule(state:State,task:Task,plan:{frequency:'daily'|'weekly',weekdays:number[],endDate:string|null},effective=today()){
 if(task.date<effective)throw new Error('重复任务请从今天或之后开始');
 const rule=repeatRuleSchema.parse({id:uid(),title:task.title,category:task.category,categoryId:task.categoryId,important:task.important,projectId:task.projectId,cardId:task.cardId,demo:task.demo,frequency:plan.frequency,weekdays:[...new Set(plan.weekdays)].sort(),startDate:task.date,endDate:plan.endDate,stoppedFrom:null});
 let first:string|undefined;for(let i=0;i<7;i++){const date=shiftDate(rule.startDate,i);if(repeatMatches(rule,date)){first=date;break;}}
 if(!first)throw new Error('所选区间内没有符合星期安排的日期');
 if(state.repeatRules.length>=500)throw new Error('重复任务数量已达上限');
 state.repeatRules.push(rule);
 // Persist only an explicitly changed occurrence; future dates stay independent.
 if(task.status!=='todo'){const occurrence=tasksForDate(state,first).find(t=>t.repeatId===rule.id)!;saveTaskOccurrence(state,{...occurrence,status:task.status});}
 return rule;
}
export function stopRepeatRule(state:State,id:string,from=shiftDate(today(),1)){const rule=state.repeatRules.find(r=>r.id===id);if(!rule)throw new Error('重复安排不存在');rule.stoppedFrom=rule.stoppedFrom&&rule.stoppedFrom<from?rule.stoppedFrom:from;}
export function repeatDescription(rule:RepeatRule){return rule.frequency==='daily'?'每天重复':'每周'+rule.weekdays.map(d=>['','一','二','三','四','五','六','日'][d]).join('、')+'重复';}
export const uncategorized:TaskCategory={id:'uncategorized',name:'未分类',createdOn:'0000-01-01',retiredOn:null};
export function normalizeState(raw:unknown):State{
 const state=stateSchema.parse(raw);
 for(const task of state.tasks){
  if(task.category==='未分类'){task.categoryId=uncategorized.id;continue;}
  if(task.categoryId&&state.taskCategories.some(c=>c.id===task.categoryId)){const c=state.taskCategories.find(c=>c.id===task.categoryId)!;if(task.date<c.createdOn||(c.retiredOn&&task.date>=c.retiredOn)){task.categoryId=uncategorized.id;task.category=uncategorized.name;}continue;}
  let category=state.taskCategories.find(c=>c.name===task.category&&c.createdOn<=task.date&&(!c.retiredOn||task.date<c.retiredOn));
  if(!category)category=state.taskCategories.find(c=>c.name===task.category);
  if(!category){category={id:'legacy-'+state.taskCategories.length,name:task.category,createdOn:'0000-01-01',retiredOn:null};state.taskCategories.push(category);}
  task.categoryId=category.id;if(task.date<category.createdOn||(category.retiredOn&&task.date>=category.retiredOn)){task.categoryId=uncategorized.id;task.category=uncategorized.name;}
 }
 return state;
}
export function categoriesForDate(state:State,date:string,alwaysUncategorized=false):TaskCategory[]{
 const result=state.taskCategories.filter(c=>c.createdOn<=date&&(!c.retiredOn||date<c.retiredOn));
 // A task retains its category snapshot even if an old backup has incomplete metadata.
 for(const task of tasksForDate(state,date)){
  if(task.categoryId!==uncategorized.id&&!result.some(c=>c.id===task.categoryId))result.push({id:task.categoryId,name:task.category,createdOn:date,retiredOn:null});
 }
 if(alwaysUncategorized||!result.length||tasksForDate(state,date).some(t=>t.categoryId===uncategorized.id))result.push(uncategorized);
 return result;
}
export function addTaskCategory(state:State,name:string,effective=today()):TaskCategory{
 const clean=name.trim();if(!clean||clean.length>40)throw new Error('分类名称需为 1–40 个字符');
 if(clean==='未分类')throw new Error('“未分类”由系统保留');
 if(state.taskCategories.some(c=>!c.retiredOn&&c.name.toLocaleLowerCase()===clean.toLocaleLowerCase()))throw new Error('已有同名分类');
 if(state.taskCategories.length>=500)throw new Error('分类记录已达上限');
 const category={id:uid(),name:clean,createdOn:effective,retiredOn:null};state.taskCategories.push(category);return category;
}
export function retireTaskCategory(state:State,id:string,effective=today()){
 const category=state.taskCategories.find(c=>c.id===id);if(!category||category.retiredOn)throw new Error('分类不存在或已删除');
 category.retiredOn=effective;let moved=0;
 for(const task of state.tasks){if(task.categoryId===id&&task.date>=effective){task.categoryId=uncategorized.id;task.category=uncategorized.name;moved++;}}
 return moved;
}
export function seed():State{
const day=today();
const projects:Project[]=[
{id:'rf',name:'RF-Diffusion',subtitle:'扩散模型 × 无线感知',stage:'实验阶段',question:'如何通过频域约束与特征提取模块，提升无线信号生成质量与下游感知表现？',datasets:['RadioML 2018','WiFi CSI','FMCW Radar'],metric:'FID',direction:'lower',baseline:28.4,sota:18.2,target:20,method:'REAConv + Frequency Loss',github:'',path:'',references:'待补充已核实的论文、代码和评估设置。示例指标仅用于演示界面，不代表论文或真实复现结果。',color:'green',demo:true},
{id:'dllm',name:'dLLM Research',subtitle:'离散扩散 × 自蒸馏',stage:'文献调研',question:'扩散语言模型如何通过 on-policy 自蒸馏，提高少步生成的推理质量？',datasets:['GSM8K'],metric:'Accuracy',direction:'higher',baseline:62.5,sota:null,target:70,method:'Self-future Distillation',github:'',path:'',references:'阅读任务：Learning from the Self-future，第 3 节。',color:'blue',demo:true},
{id:'eeg',name:'EEG Modeling',subtitle:'神经场 × 动力学建模',stage:'已完成',question:'探索 EEG 时间序列中的动态耦合与可解释建模。',datasets:['Demo EEG'],metric:'Accuracy',direction:'higher',baseline:78.2,sota:87.1,target:85,method:'Neural Field',github:'',path:'',references:'此项目与所有结果均为演示数据。',color:'violet',demo:true}];
const runs:[string,string,string,number|null][]=[['exp_041','Baseline','RadioML 2018',28.4],['exp_042','Frequency Loss','RadioML 2018',25.6],['exp_043','REAConv','RadioML 2018',23.8],['exp_044','REAConv + Frequency Loss','RadioML 2018',21.7],['exp_045','REAConv + Frequency Loss','RadioML 2018',null],['exp_038','Baseline','WiFi CSI',31.2],['exp_039','REAConv','WiFi CSI',28.6],['exp_040','REAConv + Frequency Loss','WiFi CSI',26.4],['exp_035','Baseline','FMCW Radar',24.8],['exp_036','REAConv','FMCW Radar',22.1],['exp_037','REAConv + Frequency Loss','FMCW Radar',20.3]];
const experiments:Experiment[]=runs.map((r,i)=>({id:r[0],projectId:'rf',name:r[0],method:r[1],dataset:r[2],value:r[3],status:i===4?'running':'completed',epoch:i===4?67:100,totalEpoch:100,loss:i===4?.031:null,valLoss:i===4?.044:null,gpu:i===4?82:null,notes:'界面示例；不是实际服务器记录。',updated:new Date().toISOString(),demo:true}));
experiments.push({id:'eeg1',projectId:'eeg',name:'exp_001',method:'Neural Field',dataset:'Demo EEG',value:84.7,status:'completed',epoch:100,totalEpoch:100,loss:null,valLoss:null,gpu:null,notes:'示例结果',updated:new Date().toISOString(),demo:true});
const base={due:day,projectId:'dllm',demo:true,reviews:0,level:0};
const cards:Card[]=[
{...base,id:'kl',title:'KL 散度',english:'Kullback–Leibler Divergence',topic:'数学基础',intuition:'用分布 Q 近似分布 P 时，KL 散度衡量这种近似造成的信息损失。它通常不对称。',formula:'D_KL(P ‖ Q) = Σₓ P(x) log[P(x) / Q(x)]',example:'P = [0.8, 0.2]，Q = [0.5, 0.5]。\n使用自然对数：0.8 × ln(1.6) + 0.2 × ln(0.4) ≈ 0.193 nats。\n调换 P、Q 后约为 0.223，因此两个方向并不相同。',code:'import torch\np = torch.tensor([0.8, 0.2])\nq = torch.tensor([0.5, 0.5])\nkl = (p * (p.log() - q.log())).sum()',application:'在蒸馏中约束学生与教师的预测分布；要核实 KL 的方向、求和维度与损失权重。',related:'交叉熵、熵、知识蒸馏',level:2,reviews:2},
{...base,id:'ce',title:'交叉熵',english:'Cross Entropy',topic:'数学基础',intuition:'用预测分布 Q 为真实分布 P 中的事件编码时，平均需要多少信息。分类任务中，它会惩罚给真实类别较低概率的预测。',formula:'H(P, Q) = −Σₓ P(x) log Q(x)',example:'真实类别是猫，预测猫的概率为 0.8，损失为 −ln(0.8) ≈ 0.223。\n概率降到 0.2，损失增大到约 1.609。',code:'import torch.nn.functional as F\n# 输入 logits，而非 softmax 后的概率\nloss = F.cross_entropy(logits, labels)',application:'H(P,Q) = H(P) + D_KL(P‖Q)。常用于分类与语言模型。',related:'KL 散度、Softmax、熵',level:1,reviews:1},
{...base,id:'linear',title:'线性层',english:'Linear Layer',topic:'神经网络',intuition:'对每个输入向量做一次仿射变换，把输入特征映射到新的特征空间。',formula:'y = xWᵀ + b',example:'输入 [8,16] → Linear(16,32) → 输出 [8,32]。\n含偏置参数量 = 16 × 32 + 32 = 544。',code:'from torch import nn\nlayer = nn.Linear(16, 32)\ny = layer(x)',application:'分类头、Transformer 的 Q/K/V 投影和前馈网络中常见。',related:'矩阵乘法、参数量、全连接',projectId:'rf'},
{...base,id:'onpolicy',title:'On-policy 自蒸馏',english:'On-policy Distillation',topic:'大语言模型',intuition:'在当前学生自身生成的状态或样本上获取教师信号，让学习分布贴近实际推理时会遇到的分布。',formula:'student samples → teacher signal → student update',example:'学生先生成中间状态，教师在这些状态上提供目标分布。具体采样方式、状态与教师构造以论文和生效代码为准。',code:'# 伪代码\nstate = student.sample()\ntarget = teacher(state).detach()\nloss = distill(student(state), target)',application:'用于减少训练与推理状态分布的偏差。',related:'KL 散度、知识蒸馏、dLLM'},
{...base,id:'gradient',title:'梯度',english:'Gradient',topic:'训练方法',intuition:'梯度汇总函数对各变量的偏导数，指向局部增长最快的方向。梯度下降沿负梯度更新。',formula:'θ_next = θ − η ∇θ L(θ)',example:'L(w) = (w − 3)²，w = 1 时梯度为 −4。学习率 0.1，更新得到 w = 1.4。',code:'optimizer.zero_grad()\nloss.backward()\noptimizer.step()',application:'反向传播计算梯度，优化器根据梯度和自身状态更新参数。',related:'反向传播、学习率、优化器',projectId:'rf'},
{...base,id:'unet',title:'U-Net',english:'U-shaped Network',topic:'模型架构',intuition:'编码器压缩空间信息，解码器恢复分辨率；跳跃连接传递对应尺度的细节。',formula:'encoder → bottleneck → decoder + skip connections',example:'示例：[B,64,64,64] → [B,128,32,32]。\n上采样后与编码器特征拼接，空间尺寸必须匹配。',code:'h = upsample(h)\nh = torch.cat([h, skip], dim=1)',application:'图像分割与扩散去噪网络。下采样是池化还是卷积，要查看具体实现。',related:'卷积、下采样、扩散模型',projectId:'rf',level:1,reviews:1}];
const rows:[string,Task['category'],Task['status'],boolean,string,string][]=[['背今天的单词','英语','done',false,'',''],['阅读一篇英文材料','英语','todo',false,'',''],['阅读 Self-future 第 3 节','科研','doing',true,'dllm','onpolicy'],['跑完消融实验 exp_045','科研','doing',true,'rf',''],['整理实验对比结果','科研','todo',false,'rf',''],['复习 KL 散度与交叉熵','科研','todo',false,'dllm','kl'],['完成课程作业','课程','done',false,'',''],['提交学校材料','学校事务','todo',true,'','']];
const tasks:Task[]=rows.map((v,i)=>({id:'t'+i,title:v[0],category:v[1],categoryId:'category-'+categories.indexOf(v[1] as typeof categories[number]),status:v[2],important:v[3],projectId:v[4],cardId:v[5],date:day,demo:true}));
const state:State={projects,experiments,cards,tasks,repeatRules:[],taskCategories:defaultTaskCategories(),realProjectsVersion:0,knowledgeVersion:0,demo:true};installFoundationCards(state);return state;}
