export const VERSION = '1.0.0';
export const MAX_HAR_BYTES = 10 * 1024 * 1024;
export const CATEGORIES = {
  precise_location: {label:'Precise location', pattern:/\b(?:precise (?:geo)?location|GPS (?:location|coordinates)|latitude|longitude)\b|精确位置|精準位置|精准位置|经纬度|經緯度/i},
  email: {label:'Email address', pattern:/\be-?mail(?: address(?:es)?)?\b|电子邮箱|電子郵箱|电子邮件|電子郵件|邮箱地址/i},
  device_id: {label:'Device identifier', pattern:/\b(?:device (?:identifier|id)s?|advertising (?:identifier|id)s?|IDFA|GAID|AAID|Android ID)\b|设备标识|設備識別|广告标识|廣告識別/i}
};
export const STATUS = {
  conflict: {label:'Potential contradiction',description:'A visible request conflicts with the reviewed statement.'},
  matched: {label:'Observed disclosure match',description:'The observed data type matches the reviewed disclosure.'},
  undisclosed: {label:'Disclosure not located',description:'Visible data was found without a matching reviewed statement.'},
  unobserved: {label:'Not observed in capture',description:'No recognized instance was found in the visible requests.'},
  unknown: {label:'Insufficient evidence',description:'The available policy or capture cannot settle this question.'}
};
const EMAIL_VALUE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_KEY=/^(?:e_?mail(?:_?address)?|user_?email|contact_?email)$/i;
const DEVICE_KEY=/^(?:device_?id|device_?identifier|advertising_?id|ad_?id|idfa|gaid|aaid|android_?id)$/i;
const LAT_KEY=/^(?:lat|latitude)$/i;
const LON_KEY=/^(?:lon|lng|longitude)$/i;
const EMPTY_VALUE=/^(?:null|undefined|none|unknown|\[?redacted\]?|\[?masked\]?|x+|\*+|0+|00000000-0000-0000-0000-000000000000)$/i;
const SECRET_KEY=/token|password|secret|cookie|authorization|session|credential|api.?key/i;

export function extractClaims(policy) {
  if(typeof policy!=='string') throw new Error('Paste a privacy policy as text.');
  if(policy.length>200000) throw new Error('Policy text is limited to 200,000 characters.');
  const claims=[];
  const sentences=policy.matchAll(/[^.!?。！？\n]+(?:[.!?。！？]+|$)/g);
  for(const match of sentences){
    const text=match[0].trim();
    if(!text) continue;
    const start=match.index+match[0].indexOf(text);
    const negative=/\b(?:do not|does not|don't|doesn't|never|will not|won't|are not|aren't|is not|isn't)\b|不会|不會|从不|從不|不收集|不发送|不傳送|不上传|不傳輸|不传输/i.test(text);
    const action=/\b(?:collect|send|transmit|upload|receive|process)(?:s|ed|ing)?\b|收集|发送|發送|上传|上傳|传输|傳輸|傳送/i.test(text);
    const conditional=/\b(?:if|unless|except|when|after|before|consent|permission|only|but|third.part(?:y|ies)|advertisers?|partners?|may not|not always|no longer|previously|used to|stopped|cannot|can't|sell|selling|share|sharing)\b|[?？]|如果|除非|除外|同意|授权|授權|仅|僅|第三方|共享|分享|出售|但|之后|之後/i.test(text);
    const subject=/\b(?:we|our (?:app|application|service))\b|我们|我們|本应用|本應用/i.test(text);
    const narrowedDenial=negative&&/\b(?:to|from|for|on|in|via|through|during|using|without)\b|用于|用於|向|提供给|提供給|通过|通過|期间|期間/i.test(text);
    const scoped=/\b(?:not collect|never collect|do not send|never send)\b/i.test(text) && /\b(?:may|can|do) (?:collect|send|transmit|upload)\b/i.test(text.replace(/do not/g,''));
    for(const [category,def] of Object.entries(CATEGORIES)){
      if(!def.pattern.test(text)) continue;
      const mode=!action||!subject||conditional||scoped||narrowedDenial?'review':negative?'deny':'allow';
      claims.push({id:`claim-${claims.length+1}`,category,quote:text,start,end:start+text.length,line:policy.slice(0,start).split('\n').length,mode,originalMode:mode,included:true,reason:mode==='review'?'Conditions, recipients, or unsupported wording need your review.':null});
    }
  }
  return claims.slice(0,150);
}

function safeString(value,max=300){return typeof value==='string'?value.slice(0,max):'';}
function publicHost(host){
  // Unknown host labels may themselves contain identifiers. Preserve only a masked shape.
  const known=new Set(['api.cedar.example','metrics.cedar.example','telemetry.example','api.example.test']);
  return known.has(host)?host:'[destination masked]';
}
function collectLeaves(value,path,output,depth=0){
  if(depth>15||output.length>15000){output.truncated=true;return;}
  if(value===null||typeof value!=='object') return;
  for(const [key,child] of Object.entries(value)){
    if(output.length>15000){output.truncated=true;break;}
    const childPath=Array.isArray(value)?`${path}[${key}]`:`${path}.${key}`;
    if(child!==null&&typeof child==='object') collectLeaves(child,childPath,output,depth+1);
    else output.push({key,value:child,path:childPath,parent:path});
  }
}
function valuePresent(value){
  if(value===null||value===undefined||typeof value==='boolean')return false;
  if(typeof value!=='string'&&typeof value!=='number')return false;
  const s=String(value).trim();
  return s.length>=4&&!EMPTY_VALUE.test(s);
}
function detectFields(leaves,requestIndex){
  const evidence=[];
  for(const leaf of leaves){
    if(SECRET_KEY.test(leaf.key))continue;
    if(EMAIL_KEY.test(leaf.key)&&typeof leaf.value==='string'&&EMAIL_VALUE.test(leaf.value)&&!EMPTY_VALUE.test(leaf.value)){
      evidence.push({category:'email',field:'email',path:leaf.path,requestIndex,observation:'An email-shaped value appears in an email field.',maskedValue:'[email redacted]'});
    }
    if(DEVICE_KEY.test(leaf.key)&&valuePresent(leaf.value)){
      evidence.push({category:'device_id',field:leaf.key.toLowerCase().replace(/[^a-z_]/g,''),path:leaf.path,requestIndex,observation:'A non-empty value appears in a recognized device identifier field; uniqueness is not established.',maskedValue:'[identifier redacted]'});
    }
  }
  const latitude=leaves.filter(l=>LAT_KEY.test(l.key));
  for(const lat of latitude){
    const lon=leaves.find(l=>l.parent===lat.parent&&LON_KEY.test(l.key));
    if(!lon||lat.value===null||lon.value===null||lat.value===''||lon.value==='')continue;
    if(!['string','number'].includes(typeof lat.value)||!['string','number'].includes(typeof lon.value))continue;
    const a=Number(lat.value),b=Number(lon.value);
    if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a)>90||Math.abs(b)>180)continue;
    const precision=Math.min(String(lat.value).split('.')[1]?.length??0,String(lon.value).split('.')[1]?.length??0);
    if(precision<4)continue;
    evidence.push({category:'precise_location',field:'latitude + longitude',path:`${lat.path} & ${lon.path}`,requestIndex,observation:'A valid coordinate pair with at least four decimal places is visible. This does not establish its origin or actual accuracy.',maskedValue:'[coordinates redacted]'});
  }
  return evidence;
}

export function parseHar(input){
  if(typeof input==='string'&&new TextEncoder().encode(input).length>MAX_HAR_BYTES)throw new Error('This capture exceeds the 10 MB limit. Export a smaller test session.');
  let har;
  try{har=typeof input==='string'?JSON.parse(input):input;}catch{throw new Error('This file is not valid JSON. Export a HAR from your browser’s Network panel.');}
  if(!har||!Array.isArray(har.log?.entries))throw new Error('This JSON is not a HAR: log.entries must be an array.');
  if(har.log.entries.length===0)throw new Error('The capture has no requests. Record a test session and export it again.');
  if(har.log.entries.length>5000)throw new Error('This capture contains more than 5,000 requests. Export a shorter session.');
  const requests=[];const warnings=[];
  har.log.entries.forEach((entry,index)=>{
    if(!entry||typeof entry.request!=='object'||typeof entry.request?.url!=='string')throw new Error(`Request ${index+1} is missing a URL.`);
    const req=entry.request;let url;
    try{url=new URL(req.url);if(!['http:','https:'].includes(url.protocol))throw new Error();}catch{throw new Error(`Request ${index+1} has an invalid HTTP(S) URL.`);}
    const leaves=[];
    let qi=0;
    for(const [key,value] of url.searchParams)leaves.push({key,value,path:`log.entries[${index}].request.url.query[${qi++}]`,parent:`entry-${index}-query`});
    if(Array.isArray(req.queryString))req.queryString.forEach((p,i)=>{if(p&&typeof p.name==='string')leaves.push({key:p.name,value:p.value,path:`log.entries[${index}].request.queryString[${i}].value`,parent:`entry-${index}-query-list`});});
    let bodyState='none';
    const method=safeString(req.method,12).toUpperCase()||'GET';
    const body=req.postData;
    if(body&&typeof body==='object'){
      if(Array.isArray(body.params)&&body.params.length){
        body.params.forEach((p,i)=>{if(p&&typeof p.name==='string')leaves.push({key:p.name,value:p.value,path:`log.entries[${index}].request.postData.params[${i}].value`,parent:`entry-${index}-form`});});
        bodyState='visible';
      }else if(typeof body.text==='string'&&body.text.trim()){
        const mime=safeString(body.mimeType,120).toLowerCase();
        if(mime.includes('json')||/^[\s]*[\[{]/.test(body.text)){
          try{const json=JSON.parse(body.text);if(json&&typeof json==='object'){collectLeaves(json,`log.entries[${index}].request.postData.text`,leaves);bodyState='visible';}else bodyState='unsupported';}catch{bodyState='unsupported';}
        }else if(mime.includes('application/x-www-form-urlencoded')){
          let i=0;for(const [key,value] of new URLSearchParams(body.text))leaves.push({key,value,path:`log.entries[${index}].request.postData.text.form[${i++}]`,parent:`entry-${index}-form`});bodyState='visible';
        }else bodyState='unsupported';
      }else if(Number(req.bodySize)>0||['POST','PUT','PATCH'].includes(method))bodyState='missing';
    }else if(Number(req.bodySize)>0||['POST','PUT','PATCH'].includes(method))bodyState='missing';
    if(leaves.truncated)bodyState='unsupported';
    const allEvidence=detectFields(leaves,index);
    const dedup=new Map();
    for(const e of allEvidence){const key=e.category+':'+e.field;if(!dedup.has(key))dedup.set(key,e);}
    const timestamp=typeof entry.startedDateTime==='string'&&Number.isFinite(Date.parse(entry.startedDateTime))?new Date(entry.startedDateTime).toISOString():null;
    requests.push({index,id:`request-${index+1}`,method:/^[A-Z]{1,12}$/.test(method)?method:'HTTP',host:publicHost(url.hostname),destinationId:0,timestamp,bodyState,evidence:[...dedup.values()],hasQuery:url.search.length>0,status:Number.isInteger(entry.response?.status)?entry.response.status:null});
  });
  // Group destinations without retaining their identifying labels in the report.
  const destinations=new Map();
  for(let i=0;i<requests.length;i++){
    const host=new URL(har.log.entries[i].request.url).hostname;
    if(!destinations.has(host))destinations.set(host,destinations.size+1);
    requests[i].destinationId=destinations.get(host);
  }
  const opaque=requests.filter(r=>['missing','unsupported'].includes(r.bodyState)).length;
  if(opaque)warnings.push(`${opaque} request${opaque===1?' has':'s have'} an omitted or unsupported request body.`);
  if(!requests.some(r=>r.evidence.length))warnings.push('No supported data fields were recognized. This does not establish that no personal data was sent.');
  return {requests,total:requests.length,destinationCount:destinations.size,opaque,visibleBodies:requests.filter(r=>r.bodyState==='visible').length,warnings};
}

export function audit({policy,claims,capture,context='',sample=null}){
  if(!capture?.requests?.length)throw new Error('Add a valid network capture first.');
  if(typeof policy!=='string'||!policy.trim())throw new Error('Add a privacy policy first.');
  if(!Array.isArray(claims))throw new Error('Review the extracted policy claims first.');
  for(const c of claims){
    if(!CATEGORIES[c.category]||!['allow','deny','review'].includes(c.mode))throw new Error('An interpretation is invalid. Review your claims again.');
    if(!Number.isInteger(c.start)||!Number.isInteger(c.end)||policy.slice(c.start,c.end)!==c.quote)throw new Error('A policy quote no longer matches its source. Review the updated policy again.');
  }
  const included=claims.filter(c=>c.included);
  const findings=[];
  for(const category of Object.keys(CATEGORIES)){
    const related=included.filter(c=>c.category===category);
    const evidence=capture.requests.flatMap(r=>r.evidence.filter(e=>e.category===category).map(e=>({...e,requestId:r.id,method:r.method,destinationId:r.destinationId,host:r.host,timestamp:r.timestamp,responseStatus:r.status})));
    if(!related.length&&!evidence.length)continue;
    const modes=new Set(related.map(c=>c.mode));
    let status,reason,nextStep;
    if(modes.has('review')||(modes.has('allow')&&modes.has('deny'))){
      status='unknown';reason='The policy contains conditions, conflicting statements, or wording that needs interpretation.';nextStep='Check the complete policy, recipient, purpose, consent state, and exceptions before changing the interpretation.';
    }else if(evidence.length&&modes.has('deny')){
      status='conflict';reason='The reviewed statement denies collection or transmission, while a supported field is visible in an outgoing request. Field semantics still require review.';nextStep='Verify that the field contains the claimed user data and that the statement applies to this request. Then fix the data flow or clarify the disclosure.';
    }else if(evidence.length&&modes.has('allow')){
      status='matched';reason='A visible field matches a data type covered by the reviewed statement. This does not verify purpose, recipient obligations, consent, or legal compliance.';nextStep='Confirm the receiving service, purpose, and test conditions. Keep this capture as a regression example.';
    }else if(evidence.length){
      status='undisclosed';reason='A supported field is visible, but no included, recognized policy statement covers this data type.';nextStep='Search the full policy and any referenced notices. A missed extraction or broader category disclosure may explain this finding.';
    }else if(capture.opaque){
      status='unknown';reason='No matching field was recognized, and some request bodies are missing or unsupported.';nextStep='Capture the relevant user actions with visible request bodies. Do not treat missing data as proof of absence.';
    }else{
      status='unobserved';reason='No matching field was recognized in this test capture. Local collection, other field names, headers, and untested actions remain outside this result.';nextStep='Repeat the relevant actions and permission states. This result applies only to the supplied capture and supported detectors.';
    }
    findings.push({id:`finding-${findings.length+1}`,category,title:CATEGORIES[category].label,status,reason,nextStep,claims:related.map(c=>({...c})),evidence});
  }
  const priority={conflict:0,undisclosed:1,unknown:2,matched:3,unobserved:4};
  findings.sort((a,b)=>priority[a.status]-priority[b.status]);
  const counts=Object.fromEntries(Object.keys(STATUS).map(s=>[s,findings.filter(f=>f.status===s).length]));
  return {schemaVersion:1,engineVersion:VERSION,createdAt:new Date().toISOString(),context:safeString(context,300),sample,findings,counts,coverage:{requests:capture.total,destinations:capture.destinationCount,visibleBodies:capture.visibleBodies,opaqueBodies:capture.opaque,reviewedClaims:included.length,excludedClaims:claims.length-included.length,warnings:capture.warnings,supportedCategories:Object.keys(CATEGORIES)},limitations:['Only supplied HTTP(S) requests are analyzed. No capture authenticity or app attribution is established.','Detectors cover recognized email, device identifier, and coordinate fields in URLs and supported request bodies. Headers, responses, arbitrary names, encoded data, and server-side activity are not inspected.','Policy extraction is a conservative pattern-based assistant, not an LLM. Manual review is required.','No legal compliance, consent validity, data sale, retention, deletion, or absence of collection is established.']};
}

export function exportReport(report){
  // Free-form policy quotes/context and arbitrary key paths can contain personal data.
  // The portable export keeps source offsets and fixed labels, but excludes those texts.
  const data=structuredClone(report);
  data.context='[Test context kept in browser; omitted from portable export]';
  for(const f of data.findings){
    for(const c of f.claims){delete c.quote;delete c.reason;}
    for(const e of f.evidence){e.path=`log.entries[${e.requestIndex}].request [recognized ${e.category} field; detailed path kept in browser]`;}
  }
  data.exportNote='Raw values, credentials, URL paths, unknown destination labels, policy quotes, detailed JSON keys, and free-form test context are omitted. Reopen the original files locally to inspect source offsets.';
  return data;
}

export function reportMarkdown(report){
  const r=exportReport(report);
  const lines=['# PolicyTrace evidence review','',`Generated: ${r.createdAt}`,`Engine: ${r.engineVersion}`,`Capture: ${r.coverage.requests} requests; ${r.coverage.opaqueBodies} omitted or unsupported bodies.`,r.sample?'Synthetic demonstration — not a real app finding.':'User-provided inputs.','',r.exportNote,''];
  if(r.inputFingerprints)lines.push(`Policy SHA-256: ${r.inputFingerprints.policy}`,`HAR SHA-256: ${r.inputFingerprints.har}`,'Fingerprints identify the supplied inputs; they do not establish capture authenticity.','');
  for(const f of r.findings){lines.push(`## ${f.title} — ${STATUS[f.status].label}`,'',f.reason,'');for(const c of f.claims)lines.push(`- Policy source: line ${c.line}, character offsets ${c.start}–${c.end}; reviewed interpretation: ${c.mode}.`);for(const e of f.evidence)lines.push(`- ${e.requestId}: ${e.method} → destination ${e.destinationId}; ${e.field}: ${e.maskedValue}; ${e.path}`);lines.push('',`Next step: ${f.nextStep}`,'');}
  lines.push('## Limits','',...r.limitations.map(x=>'- '+x));
  return lines.join('\n');
}
