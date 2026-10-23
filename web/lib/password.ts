export const passwordIterations=100000;
const bytes=(s:string)=>new TextEncoder().encode(s);
export const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
export function randomSecret(){return hex(crypto.getRandomValues(new Uint8Array(32)).buffer);}
export async function tokenHash(s:string){return hex(await crypto.subtle.digest('SHA-256',bytes(s)));}
export async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',bytes(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:passwordIterations,salt:bytes(salt)},key,256));}
export function equalSecret(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
export function accountInput(value:unknown){const v=value as Record<string,unknown>;if(!v||typeof v.username!=='string'||typeof v.password!=='string')throw new Error('请填写用户名和密码');const username=v.username.trim().toLowerCase();if(!/^[a-z0-9_\-.]{3,40}$/.test(username))throw new Error('用户名需为 3–40 位字母、数字、点、横线或下划线');if(v.password.length<12||v.password.length>128)throw new Error('密码长度需为 12–128 个字符');return {username,password:v.password};}
