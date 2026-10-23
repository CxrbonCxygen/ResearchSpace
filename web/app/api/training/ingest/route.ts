import {env} from 'cloudflare:workers';
import {tokenHash} from '../../../../lib/password';
import {trainingSnapshotSchema} from '../../../../lib/training-model';
import {ingestTraining} from '../../../../lib/training-store';
export async function POST(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (rst_[a-f0-9]{64})$/)?.[1];if(!token)return Response.json({error:'需要实验同步令牌'},{status:401});
 const key=await env.DB!.prepare('SELECT user_id,run_key FROM research_training_keys WHERE hash=?').bind(await tokenHash(token)).first<{user_id:string,run_key:string}>();if(!key)return Response.json({error:'同步令牌无效'},{status:401});
 try{const raw=await request.text();if(raw.length>1500000)return Response.json({error:'单次记录过大'},{status:413});const result=trainingSnapshotSchema.safeParse(JSON.parse(raw));if(!result.success)return Response.json({error:'实验记录格式有误'},{status:400});if(result.data.runKey!==key.run_key)return Response.json({error:'该令牌仅允许同步指定实验'},{status:403});return Response.json(await ingestTraining(key.user_id,result.data));}catch{return Response.json({error:'同步暂时失败，请重试'},{status:503});}
}
