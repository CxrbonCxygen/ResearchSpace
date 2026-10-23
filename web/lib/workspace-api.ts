export type WorkspaceTransport=(url:string,options?:RequestInit)=>Promise<Response>;
let custom:WorkspaceTransport|undefined;
export function setWorkspaceTransport(transport:WorkspaceTransport){custom=transport;}
export function workspaceFetch(url:string,options?:RequestInit){return custom?custom(url,options):fetch(url,options);}
