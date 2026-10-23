import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig({root,base:'./',plugins:[react()],publicDir:false,build:{outDir:'../outputs/mobile-web',emptyOutDir:true},server:{host:'127.0.0.1',port:5174,proxy:{'/qa-cloud':{target:'http://127.0.0.1:5173',changeOrigin:true,rewrite:path=>path.replace(/^\/qa-cloud/,''),configure:proxy=>{proxy.on('proxyReq',req=>req.setHeader('Origin','http://127.0.0.1:5173'));}}},fs:{allow:[fileURLToPath(new URL('..',import.meta.url))]}}});
