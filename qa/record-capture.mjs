import {createServer} from 'node:http';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {audit,extractClaims,parseHar,exportReport} from '../dist/engine.js';
await mkdir('fixtures',{recursive:true});
const policy='We never transmit precise location.\nWe do not collect device identifiers.\nWe collect email addresses.';
const html=`<!doctype html><html><body><h1>Cedar Notes: synthetic integration fixture</h1><button id="send">Open sample note</button><script>document.querySelector('#send').onclick=async()=>{await fetch('/collect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({latitude:25.0339,longitude:121.5645,device_id:'SYNTHETIC-INTEGRATION-001',email:'fixture@example.test'})});document.body.dataset.done='true'};</script></body></html>`;
const received=[];
const server=createServer(async(req,res)=>{if(req.url==='/collect'){let body='';for await(const chunk of req)body+=chunk;received.push(JSON.parse(body));res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true}');}else{res.writeHead(200,{'Content-Type':'text/html'});res.end(html);}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
try{
 const context=await browser.newContext({recordHar:{path:resolve('fixtures/browser-capture.har'),content:'embed',mode:'full'}});
 const page=await context.newPage();await page.goto(`http://127.0.0.1:${port}`);await page.locator('#send').click();await page.waitForFunction(()=>document.body.dataset.done==='true');await context.close();
 const capture=parseHar(await readFile('fixtures/browser-capture.har','utf8'));
 const report=audit({policy,claims:extractClaims(policy),capture,context:'Real browser HTTP request to a local controlled endpoint, using synthetic data.',sample:'browser-integration'});
 assert.equal(received.length,1);assert.equal(received[0].device_id,'SYNTHETIC-INTEGRATION-001');assert.equal(report.counts.conflict,2);assert.equal(report.counts.matched,1);
 await writeFile('fixtures/browser-policy.txt',policy);
 await writeFile('fixtures/browser-report.json',JSON.stringify(exportReport(report),null,2));
 console.log(JSON.stringify({passed:true,requests:received.length,findings:report.counts,note:'Real HTTP traffic, synthetic values, controlled local target.'}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
