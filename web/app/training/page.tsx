import {redirect} from 'next/navigation';
import {getWorkspaceUser} from '../../lib/account';
import TrainingDashboard from './dashboard';
export const dynamic='force-dynamic';
export default async function Page(){if(!await getWorkspaceUser())redirect('/login');return <TrainingDashboard/>;}
