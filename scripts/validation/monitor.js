// One observation is one readiness probe. A local sample is not a monthly SLA.
const fs=require('fs');const path=require('path');
const target=process.env.MONITOR_URL||'http://127.0.0.1:3100/ready';
const output=process.env.MONITOR_FILE||path.join(__dirname,'../../docs/validation/evidence/uptime-samples.jsonl');
const interval=Number(process.env.MONITOR_INTERVAL_MS||60000);
const duration=Number(process.env.MONITOR_DURATION_MS||0);
const start=Date.now();
async function probe(){const began=Date.now();let status=null,error=null;try{const r=await fetch(target,{signal:AbortSignal.timeout(10000)});status=r.status;}catch(e){error=e.name;}
fs.mkdirSync(path.dirname(output),{recursive:true});fs.appendFileSync(output,JSON.stringify({timestamp:new Date().toISOString(),target,status,ok:status===200,latencyMs:Date.now()-began,error})+'\n');}
(async()=>{do{await probe();if(duration&&Date.now()-start>=duration)break;await new Promise(r=>setTimeout(r,interval));}while(true);})().catch(e=>{console.error(e);process.exitCode=1;});
