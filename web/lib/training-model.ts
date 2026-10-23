import {z} from 'zod';
export const metricLabels:Record<string,string>={loss:'训练 Loss',grad_norm:'梯度范数',learning_rate:'学习率',clip_ratio:'裁剪比例',top_k_overlap:'Top-k 重合率',completion_length:'生成长度',iter_num:'迭代数',eval_loss:'验证 Loss'};
export const trainingSnapshotSchema=z.object({
 runKey:z.string().regex(/^[a-zA-Z0-9._-]{1,150}$/),name:z.string().min(1).max(180),projectId:z.string().max(100),dataset:z.string().max(100),maxSteps:z.number().int().min(1).max(100000000),currentStep:z.number().int().min(0),historyStep:z.number().int().min(0),
 stage:z.string().max(100).default(''),status:z.enum(['running','evaluating','completed','stopped','failed']),observedAt:z.string().datetime({offset:true}),source:z.string().max(200),logPath:z.string().max(600),
 gpus:z.array(z.object({index:z.number().int().min(0),utilization:z.number().min(0).max(100),memoryUsed:z.number().nonnegative(),memoryTotal:z.number().positive()})).max(32),
 evaluations:z.array(z.object({name:z.string().max(160),length:z.number().int().positive(),samples:z.number().int().positive(),correct:z.number().int().nonnegative(),accuracy:z.number().min(0).max(1),seconds:z.number().nonnegative()})).max(100),
 points:z.array(z.object({step:z.number().int().min(0),values:z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,60}$/),z.number().finite()).refine(v=>Object.keys(v).length<=30)})).max(5000),
}).superRefine((s,c)=>{if(s.currentStep>s.maxSteps||s.historyStep>s.currentStep||s.points.some(p=>p.step>s.currentStep)||s.evaluations.some(e=>e.correct>e.samples))c.addIssue({code:'custom',message:'步数或评测计数不一致'});});
export type TrainingSnapshot=z.infer<typeof trainingSnapshotSchema>;
export type TrainingMeta=Omit<TrainingSnapshot,'points'>;
export type TrainingRun=TrainingMeta&{receivedAt:string,pointCount:number};
export type TrainingPoint={step:number,metric:string,value:number};
export function flattenPoints(points:TrainingSnapshot['points']):TrainingPoint[]{const m=new Map<string,TrainingPoint>();for(const p of points)for(const [metric,value] of Object.entries(p.values))m.set(p.step+':'+metric,{step:p.step,metric,value});return [...m.values()];}
export function splitTraining(s:TrainingSnapshot){const {points,...meta}=s;return {meta,points:flattenPoints(points)};}
