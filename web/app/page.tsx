import Workspace from './workspace';
import {getWorkspaceUser} from '../lib/account';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page(){if(!await getWorkspaceUser())redirect('/login');return <Workspace/>;}
