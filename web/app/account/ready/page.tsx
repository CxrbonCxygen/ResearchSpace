import {redirect} from 'next/navigation';
import {getWorkspaceUser} from '../../../lib/account';
export const dynamic='force-dynamic';
export default async function Page(){if(!await getWorkspaceUser())redirect('/login');return <main className="account-page"><section className="account-card"><span className="account-mark">✓</span><h1>独立账号已设置</h1><p>原有记录已经关联到新账号。安卓 APP 联网后可以使用此账号登录和同步。</p><p>如果站点仍显示平台登录页，请回到当前对话通知我完成入口切换。</p><a className="btn primary full" href="/">进入科研空间</a><a className="btn full" href="/downloads/researchspace.apk">下载 Android 安装包</a></section></main>;}
