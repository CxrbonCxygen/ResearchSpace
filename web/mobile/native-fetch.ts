type NativeNetwork={request:(id:string,path:string,method:string,body:string,authorization:string)=>void};
declare global{interface Window{__researchSpaceResponse?:(id:string,status:number,body:string)=>void}}
const pending=new Map<string,{resolve:(r:Response)=>void,reject:(e:Error)=>void}>();
window.__researchSpaceResponse=(id,status,body)=>{const item=pending.get(id);if(!item)return;pending.delete(id);if(status<200||status>599){item.reject(Error('无法连接云端，请联网后重试'));return;}item.resolve(new Response(body,{status,headers:{'Content-Type':'application/json'}}));};
export const nativeFetch:typeof fetch=async(input,options={})=>{
 const bridge=window.ResearchSpaceAndroid as unknown as NativeNetwork|undefined;if(!bridge?.request)return fetch(input,options);
 const url=new URL(String(input));if(url.origin!=='https://researchspace-chenxin.cxrboncxygen.chatgpt.site')throw Error('请求地址无效');
 return new Promise<Response>((resolve,reject)=>{const id=crypto.randomUUID();pending.set(id,{resolve,reject});const timer=setTimeout(()=>{pending.delete(id);reject(Error('云端连接超时，本机记录仍保留'));},20000);const success=(r:Response)=>{clearTimeout(timer);resolve(r);};const failure=(e:Error)=>{clearTimeout(timer);reject(e);};pending.set(id,{resolve:success,reject:failure});options.signal?.addEventListener('abort',()=>{pending.delete(id);failure(Error('连接已取消'));},{once:true});bridge.request(id,url.pathname+url.search,options.method??'GET',String(options.body??''),new Headers(options.headers).get('Authorization')??'');});
};
