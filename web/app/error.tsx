'use client';
export default function ErrorPage({reset}:{error:Error&{digest?:string},reset:()=>void}){
 return <main className="loading-state" role="alert"><h2>页面加载未完成</h2><p>部分页面资源未能下载，请检查网络后重试。</p><button className="btn" onClick={()=>window.location.reload()}>重新加载</button><button className="btn soft" onClick={reset}>重试</button></main>;
}
