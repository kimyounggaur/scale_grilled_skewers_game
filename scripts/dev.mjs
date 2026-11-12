import {spawn} from 'node:child_process';
const incoming=process.argv.slice(2), args=['dev'];
for(let i=0;i<incoming.length;i++){const a=incoming[i];if(a==='--host'){args.push('--hostname',incoming[++i]);}else if(a!=='--strictPort'){args.push(a);}}
const child=spawn(process.execPath,['node_modules/next/dist/bin/next',...args],{stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??0));
