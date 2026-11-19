// Capture branded browser/version smoke checks without relabelling Playwright engines.
const fs=require('fs');
const path=require('path');

const output=process.env.BROWSER_MATRIX_FILE||path.join(__dirname,'../../docs/validation/evidence/branded-browser-matrix.json');
const entry={
  browser:process.env.BROWSER_NAME,
  version:process.env.BROWSER_VERSION,
  deviceOs:process.env.DEVICE_OS,
  testedAt:new Date().toISOString(),
  baseUrl:process.env.BASE_URL,
  scenarios:{registerLogin:null,createEditAssignComment:null,searchFilterDashboard:null,keyboard360px:null},
  evidence:[],
  notes:process.env.BROWSER_MATRIX_NOTES||''
};
if(!entry.browser||!entry.version||!entry.deviceOs||!entry.baseUrl){
  console.error('Set BROWSER_NAME, BROWSER_VERSION, DEVICE_OS and BASE_URL after running the browser workflow.');
  process.exit(2);
}
for(const key of Object.keys(entry.scenarios)){
  const value=process.env[`MATRIX_${key.replace(/[A-Z]/g,m=>`_${m.toLowerCase()}`).toUpperCase()}`];
  if(!['PASS','FAIL','NOT_RUN'].includes(value||'')){
    console.error(`Set MATRIX_${key.replace(/[A-Z]/g,m=>`_${m.toLowerCase()}`).toUpperCase()} to PASS, FAIL or NOT_RUN.`);
    process.exit(2);
  }
  entry.scenarios[key]=value;
}
entry.evidence=(process.env.BROWSER_MATRIX_EVIDENCE||'').split(path.delimiter).filter(Boolean);
fs.mkdirSync(path.dirname(output),{recursive:true});
let matrix=[];
if(fs.existsSync(output)) matrix=JSON.parse(fs.readFileSync(output,'utf8'));
matrix=matrix.filter(x=>!(x.browser===entry.browser&&x.version===entry.version&&x.deviceOs===entry.deviceOs));
matrix.push(entry);
fs.writeFileSync(output,JSON.stringify(matrix,null,2)+'\n');
console.log(`Recorded ${entry.browser} ${entry.version} on ${entry.deviceOs}: ${output}`);
