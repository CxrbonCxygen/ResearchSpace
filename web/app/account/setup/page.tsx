import {redirect} from 'next/navigation';
import {requireChatGPTUser} from '../../chatgpt-auth';
import {ownerAccount} from '../../../lib/account';
import LoginForm from '../../login/login-form';
export const dynamic='force-dynamic';
export default async function Page(){if(await ownerAccount())redirect('/account/ready');await requireChatGPTUser('/account/setup');return <LoginForm setup/>;}
