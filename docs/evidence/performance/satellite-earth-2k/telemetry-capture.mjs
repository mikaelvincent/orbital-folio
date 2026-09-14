import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
const result={at:new Date().toISOString(),phase:process.argv[2],native:JSON.parse(execFileSync('/tmp/orbital-folio-mac-thermal-snapshot',{encoding:'utf8'})),power:execFileSync('/usr/bin/pmset',['-g','batt'],{encoding:'utf8'})};
appendFileSync('docs/evidence/performance/satellite-earth-2k/thermal-context.jsonl',JSON.stringify(result)+'\n');console.log(JSON.stringify(result));
