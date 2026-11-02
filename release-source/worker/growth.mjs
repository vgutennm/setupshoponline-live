import { ASSESSMENT_INSTRUCTIONS, METHODOLOGY_VERSION, REVIEW_INSTRUCTIONS, REVIEW_SCHEMA } from "./growth-analysis.mjs";
import { queueReport, processGrowthDelivery, deliveryStatus, growthMailConfigured } from "./growth-delivery.mjs";
import { one, run, rows } from "./db.mjs";
import { QUESTIONS, QUESTION_VERSION, validateAnswers, CATEGORIES, CATEGORY_GUIDANCE, categoryInfo, getQuestions } from "./growth-questions.mjs";
import { REPORT_SCHEMA, INSTRUCTIONS, validateReport, reportPages } from "./growth-report.mjs";
import { createReportPdf } from "./growth-pdf.mjs";
const COOKIE="growth_access";
const ownerEmail="vlad@setupshoponline.com";
const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer",...extra}});
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v))),x=>x.toString(16).padStart(2,"0")).join("");
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,"0")).join("");
function identity(req,env){
  const u=new URL(req.url);
  if(env.LOCAL_PREVIEW===true&&["127.0.0.1","localhost"].includes(u.hostname))return "local-owner";
  const id=req.headers.get("oai-authenticated-user-id");
  return id&&req.headers.get("oai-authenticated-user-email")?.toLowerCase()===ownerEmail?id:null;
}
function sameOrigin(req,env){const u=new URL(req.url);return req.headers.get("origin")===u.origin&&(["setupshoponline.vlad554726.chatgpt.site","setupshoponline.com","www.setupshoponline.com"].includes(u.hostname)||env.LOCAL_PREVIEW===true&&["127.0.0.1","localhost"].includes(u.hostname));}
async function body(req){if(!req.headers.get("content-type")?.startsWith("application/json"))throw new Error("Please submit this form from the website.");const raw=await req.text();if(raw.length>10000)throw new Error("Your answers are too long.");let v;try{v=JSON.parse(raw);}catch{throw new Error("Please check your answers.");}if(!v||typeof v!=="object"||Array.isArray(v))throw new Error("Please check your answers.");return v;}
async function session(req,env,owner){const COOKIE=new URL(req.url).pathname.startsWith("/api/agentic/")?"agentic_access":"growth_access";const t=(req.headers.get("cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);if(!t||!/^[a-f0-9]{64}$/.test(t))return null;return one(env,"SELECT * FROM growth_assessments WHERE session_hash=? AND owner_id=? AND expires_at>?",await hash(t),owner,Date.now());}
const usable=env=>Boolean(env.OPENAI_API_KEY);
function view(row){return {id:row.id,category:row.category,contact:JSON.parse(row.contact_json),answers:JSON.parse(row.answers_json),step:row.step,status:row.status,createdAt:new Date(row.created_at).toISOString(),report:row.status==="ready"&&row.report_json?JSON.parse(row.report_json):null,errorCode:row.error_code,methodologyVersion:row.methodology_version};}
async function poll(row,env){
  if(!["analyzing","reviewing"].includes(row.status)||!row.response_id||Date.now()-row.last_poll<4000)return row;
  const lock=await run(env,"UPDATE growth_assessments SET last_poll=? WHERE id=? AND last_poll=? AND status=?",Date.now(),row.id,row.last_poll,row.status);
  if(!lock.meta?.changes)return row;
  try{
    const r=await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(row.response_id)}`,{headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`},signal:AbortSignal.timeout(12000)});
    if(!r.ok){if(r.status===404)await run(env,"UPDATE growth_assessments SET status='failed',error_code='response_unavailable' WHERE id=? AND status IN ('analyzing','reviewing')",row.id);return row;}
    const value=await r.json();
    if(value.status==="completed"){
      const text=(value.output||[]).filter(x=>x.type==="message").flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("");
      if(row.status==="analyzing"){
        const report=validateReport(JSON.parse(text));
        if(!report.assessment||report.findings.some(f=>f.evidence_ids.some(id=>!getQuestions(row.category).some(q=>q.id===id))))throw new Error("report_validation_failed");
        const lock=await run(env,"UPDATE growth_assessments SET status='review_starting',report_json=?,updated_at=? WHERE id=? AND status='analyzing'",JSON.stringify(report),Date.now(),row.id);
        if(lock.meta?.changes){
          try{
            const review=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:["get-better-leads","close-more-deals","save-time","repeat-business","profitability"].includes(row.category)?"gpt-5.4":"gpt-5.4-mini",background:true,store:true,max_output_tokens:2500,instructions:REVIEW_INSTRUCTIONS+"\nReject only a material factual, safety, or clarity error, not optional stylistic improvements. Each rejection issue must quote the exact offending report text. For factual or safety errors explain the conflicting or missing answer evidence. For clarity errors explain which action, measurement, responsibility, or important limitation a non-specialist cannot understand. Never invent an offending quote or repeat a generic checklist. A recommendation to start tracking is not a factual claim that no tracking exists. A clearly labeled hypothesis (including likely, suggests, appears) is not a verified diagnosis. Unknown baselines in the supplied assessment are valid. Human-reviewed AI drafting is not autonomous rejection. Use category guidance to understand boundaries, not to demand every possible recommendation or exact phrasing.",input:JSON.stringify({answers:JSON.parse(row.answers_json),questions:getQuestions(row.category),report}),text:{format:{type:"json_schema",name:"assessment_quality_review",strict:true,schema:REVIEW_SCHEMA}}}),signal:AbortSignal.timeout(20000)});
            if(!review.ok){await run(env,"UPDATE growth_assessments SET status='failed',error_code='review_start_failed' WHERE id=? AND status='review_starting'",row.id);}
            else{const result=await review.json();if(!result.id)throw new Error('missing_review_id');await run(env,"UPDATE growth_assessments SET status='reviewing',response_id=?,last_poll=0,updated_at=? WHERE id=? AND status='review_starting'",result.id,Date.now(),row.id);}
          }catch{await run(env,"UPDATE growth_assessments SET status='uncertain',error_code='review_start_unconfirmed' WHERE id=? AND status='review_starting'",row.id);}
        }
      }else{
        const review=JSON.parse(text);
        if(typeof review.approved!=="boolean"||!Array.isArray(review.issues)||review.issues.some(x=>typeof x!=="string"))throw new Error("report_validation_failed");
        const approved=review.approved===true&&review.issues.length===0;
        // Check the actual PDF before making the report available or queuing email.
        if(approved) await createReportPdf(reportPages(JSON.parse(row.report_json),JSON.parse(row.contact_json),JSON.parse(row.answers_json),{createdAt:new Date(row.created_at).toISOString()}),{createdAt:row.created_at});
        await run(env,"UPDATE growth_assessments SET review_json=?,status=?,updated_at=?,error_code=? WHERE id=? AND status='reviewing'",JSON.stringify(review),approved?'ready':'failed',Date.now(),approved?null:'quality_review_failed',row.id);
      }
    }else if(["failed","cancelled","incomplete"].includes(value.status)){const code=["credit_balance_exhausted","insufficient_quota"].includes(value.error?.code)?"api_credits_required":"analysis_incomplete";await run(env,"UPDATE growth_assessments SET status='failed',error_code=?,updated_at=? WHERE id=? AND status IN ('analyzing','reviewing')",code,Date.now(),row.id);}
  }catch(e){if(e.message==="report_page_limit_exceeded"){await run(env,"UPDATE growth_assessments SET status='failed',error_code='report_page_limit_exceeded' WHERE id=? AND status='reviewing'",row.id);}
    if(e.message==="report_validation_failed"||e instanceof SyntaxError)await run(env,"UPDATE growth_assessments SET status='failed',error_code='report_validation_failed' WHERE id=? AND status IN ('analyzing','reviewing')",row.id);}
  return await one(env,"SELECT * FROM growth_assessments WHERE id=?",row.id);
}
export async function handleGrowth(req,env,ctx){
  let path=new URL(req.url).pathname;
  const agentic=path.startsWith('/api/agentic/');
  const COOKIE=agentic?'agentic_access':'growth_access';
  const cookiePath=agentic?'/api/agentic':'/api/growth';
  if(agentic)path=path.replace('/api/agentic/','/api/growth/');
  const publicGateway=path.startsWith('/api/growth/public/');
  if(publicGateway){
    const key=env.GROWTH_RUNNER_KEY,supplied=req.headers.get('x-growth-runner-key')||'';
    if(typeof key!=='string'||key.length<48||supplied.length>256)return json({error:'Unauthorized.'},401);
    const a=await hash(key),b=await hash(supplied);let difference=0;
    for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);
    if(difference)return json({error:'Unauthorized.'},401);
    const action=path.slice('/api/growth/public/'.length);
    const methods={config:'GET',session:'GET',start:'POST',category:'POST',answers:'POST',generate:'POST',status:'GET',download:'GET',new:'POST',retry:'POST'};
    if(!Object.hasOwn(methods,action))return json({error:'Not found.'},404);
    if(req.method!==methods[action]&&!(action==='download'&&req.method==='HEAD'))return json({error:'Method not allowed.'},405);
    if(action==='start'&&req.headers.get('x-growth-form-verified')!=='1')return json({error:'Please complete the contact form and CAPTCHA.'},403);
    path='/api/growth/'+action;
  }
  if(!path.startsWith("/api/growth/"))return null;
  if(path==="/api/growth/runner"){
    if(req.method!=="POST")return json({error:"Method not allowed."},405);
    const configuredKey=env.GROWTH_RUNNER_KEY;
    const supplied=req.headers.get("x-growth-runner-key")||"";
    if(typeof configuredKey!=="string"||configuredKey.length<48||supplied.length>256)return json({error:"Unauthorized."},401);
    const a=await hash(configuredKey),b=await hash(supplied);let difference=0;
    for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);
    if(difference)return json({error:"Unauthorized."},401);
    try{return json({ok:true,completedAt:new Date().toISOString(),...await maintainGrowth(env)});}
    catch{return json({error:"Background processing failed."},503);}
  }
  const owner=publicGateway?"public-visitor":identity(req,env);
  if(!owner)return json({error:"This assessment is a private owner preview. Please sign in with the site owner account."},403);
  if(!publicGateway&&req.method!=="GET"&&req.method!=="HEAD"&&!sameOrigin(req,env))return json({error:"Please use the assessment on this website."},403);
  try{
    if(path==="/api/growth/config"&&req.method==="GET")return json({preview:!publicGateway,analysisReady:usable(env),guidanceMode:"Saved IR Brain planning guidance",liveIrBrain:false,emailEnabled:growthMailConfigured(env),methodology:METHODOLOGY_VERSION,categories:CATEGORIES.filter(c=>agentic?c.id==="agentic-readiness":c.id!=="agentic-readiness")});
    if(path==="/api/growth/start"&&req.method==="POST"){
      const d=await body(req);const contact={};
      for(const [key,max] of [["full_name",120],["email",254],["phone",40],["business_name",160]]){if(key==="phone" && d[key]==null)d[key]="";if(typeof d[key]!=="string"||(key!=="phone"&&d[key].trim().length<2)||d[key].length>max||/[\x00-\x1f\x7f]/.test(d[key]))return json({error:`Please check ${key.replaceAll("_"," ")}.`},400);contact[key]=d[key].trim();}
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)||(contact.phone!==""&&(!/^[+\d\s().-]+$/.test(contact.phone)||contact.phone.replace(/\D/g,"").length<7||contact.phone.replace(/\D/g,"").length>15)))return json({error:"Please enter a valid email and phone number."},400);
      if(!/^[a-f0-9-]{36}$/i.test(d.submission_id))return json({error:"Please refresh this form."},400);
      const current=await session(req,env,owner);if(current?.id===d.submission_id)return json({session:view(current),questions:getQuestions(current.category)});
      if(await one(env,"SELECT id FROM growth_assessments WHERE id=?",d.submission_id))return json({error:"This request was already saved. Reload to resume, or start a new form."},409);
      const count=await one(env,"SELECT COUNT(*) AS total FROM growth_assessments WHERE owner_id=? AND created_at>?",owner,Date.now()-3600000);if(count.total>=(publicGateway?100:20))return json({error:"Please resume an existing assessment or try again later."},429);
      const now=Date.now(),t=token();
      await run(env,"INSERT INTO growth_assessments (id,owner_id,session_hash,expires_at,contact_json,answers_json,question_version,step,status,created_at,updated_at,last_poll,category) VALUES (?,?,?,?,?,'{}',?,0,'draft',?,?,0,?)",d.submission_id,owner,await hash(t),now+86400000,JSON.stringify(contact),agentic?"agentic-readiness-v1-2026-10-06":QUESTION_VERSION,now,now,agentic?"agentic-readiness":"unselected");
      const saved=await one(env,"SELECT * FROM growth_assessments WHERE id=?",d.submission_id);
      return json({session:view(saved),questions:agentic?getQuestions("agentic-readiness"):[]},200,{"Set-Cookie":`${COOKIE}=${t}; HttpOnly; SameSite=Strict; Path=${cookiePath}; Max-Age=86400${new URL(req.url).protocol==="https:"?"; Secure":""}`});
    }
    if(path==="/api/growth/maintenance"&&req.method==="POST")return json(await maintainGrowth(env));
    let row=await session(req,env,owner);
    if(path==="/api/growth/session"&&req.method==="GET")return json({session:row?view(row):null,...row?{questions:getQuestions(row.category)}:{}});
    if(row&&((row.category==="agentic-readiness")!==agentic))return json({error:"Please open the matching assessment."},403);
    if(!row)return json({error:"Please complete the contact form to start or resume your assessment."},401);
    if(path==="/api/growth/category"&&req.method==="POST"){
      const d=await body(req);if(!categoryInfo(d.category)||(agentic?d.category!=="agentic-readiness":d.category==="agentic-readiness"))return json({error:'Please choose a category.'},400);
      if(row.status!=='draft')return json({error:'This assessment is already submitted.'},409);
      const retainedAnswers=validateAnswers(JSON.parse(row.answers_json),false,d.category);
      await run(env,"UPDATE growth_assessments SET category=?,question_version=?,answers_json=?,step=0,updated_at=? WHERE id=? AND status='draft'",d.category,'categories-v2-2026-09-29',JSON.stringify(retainedAnswers),Date.now(),row.id);
      const selected=await one(env,'SELECT * FROM growth_assessments WHERE id=?',row.id);
      return json({session:view(selected),questions:getQuestions(selected.category)});
    }
    if(path==="/api/growth/new"&&req.method==="POST"){
      if(!["ready","failed"].includes(row.status))return json({error:"Please finish this assessment first."},409);
      const now=Date.now(),id=crypto.randomUUID(),t=token();
      const count=await one(env,"SELECT COUNT(*) AS total FROM growth_assessments WHERE owner_id=? AND created_at>?",owner,now-3600000);
      if(count.total>=(publicGateway?100:20))return json({error:"Please resume an existing assessment or try again later."},429);
      await run(env,"INSERT INTO growth_assessments (id,owner_id,session_hash,expires_at,contact_json,answers_json,question_version,step,status,created_at,updated_at,last_poll,category) VALUES (?,?,?,?,?,'{}',?,0,'draft',?,?,0,?)",id,owner,await hash(t),now+86400000,row.contact_json,agentic?"agentic-readiness-v1-2026-10-06":QUESTION_VERSION,now,now,agentic?"agentic-readiness":"unselected");
      return json({session:view(await one(env,"SELECT * FROM growth_assessments WHERE id=?",id)),questions:agentic?getQuestions("agentic-readiness"):[]},200,{"Set-Cookie":`${COOKIE}=${t}; HttpOnly; SameSite=Strict; Path=${cookiePath}; Max-Age=86400${new URL(req.url).protocol==="https:"?"; Secure":""}`});
    }
    if(path==="/api/growth/retry"&&req.method==="POST"){
      if(row.status!=="failed")return json({error:"Only a confirmed failed report can be retried."},409);
      await run(env,"UPDATE growth_assessments SET status='draft',response_id=NULL,report_json=NULL,review_json=NULL,error_code=NULL,updated_at=? WHERE id=? AND status='failed'",Date.now(),row.id);
      return json({session:view(await one(env,"SELECT * FROM growth_assessments WHERE id=?",row.id))});
    }
    if(path==="/api/growth/answers"&&req.method==="POST"){
      if(row.status!=="draft")return json({error:"This assessment is already submitted."},409);
      const d=await body(req),answers=validateAnswers(d.answers,false,row.category),step=Number(d.step);
      if(!Number.isInteger(step)||step<0||step>10)return json({error:"Please check your progress."},400);
      const r=await run(env,"UPDATE growth_assessments SET answers_json=?,step=?,updated_at=? WHERE id=? AND status='draft'",JSON.stringify(answers),step,Date.now(),row.id);
      if(!r.meta?.changes)return json({error:"This assessment was already submitted."},409);
      return json({saved:true});
    }
    if(path==="/api/growth/generate"&&req.method==="POST"){
      if(row.status!=="draft")return json({session:view(row)});
      if(!usable(env))return json({error:"Your answers are saved. Report generation will be available when the site's secure AI connection is enabled."},503);
      if(!categoryInfo(row.category))return json({error:'Please choose an assessment category first.'},400);
      const answers=validateAnswers(JSON.parse(row.answers_json),true,row.category);
      const now=Date.now(),email=JSON.parse(row.contact_json).email.trim().toLowerCase();
      const ownerAllowance=email==="vlad@setupshoponline.com",emailLimit=ownerAllowance?5:1;
      // The conditional write is atomic across browser sessions and devices.
      // Retrying the same confirmed failed assessment does not consume another slot.
      const lock=await run(env,`UPDATE growth_assessments SET status='creating',submitted_at=COALESCE(submitted_at,?),methodology_version=?,updated_at=?
        WHERE id=? AND status='draft' AND (SELECT COUNT(*) FROM growth_assessments prior
          WHERE lower(trim(json_extract(prior.contact_json,'$.email')))=?
            AND (?=1 OR prior.category=?) AND prior.submitted_at>? AND prior.id<>?
            AND prior.status<>'draft'
        ) < ?`,now,METHODOLOGY_VERSION,now,row.id,email,ownerAllowance?1:0,row.category,now-86400000,row.id,emailLimit);
      if(!lock.meta?.changes){
        const current=await one(env,"SELECT * FROM growth_assessments WHERE id=?",row.id);
        if(current.status!=='draft')return json({session:view(current)});
        const previous=await one(env,`SELECT ${ownerAllowance?"MIN":"MAX"}(submitted_at) AS submitted_at FROM growth_assessments
          WHERE lower(trim(json_extract(contact_json,'$.email')))=? AND (?=1 OR category=?)
            AND submitted_at>? AND id<>? AND status<>'draft'`,email,ownerAllowance?1:0,row.category,now-86400000,row.id);
        return json({error:ownerAllowance?'Your email has reached its limit of 5 reports in the past 24 hours. Your answers are saved.':'This email has already submitted this category in the past 24 hours. Your answers are saved. You can still submit a different category.',retryAt:new Date(previous.submitted_at+86400000).toISOString()},429);
      }
      const day=new Date().toISOString().slice(0,10)+(ownerAllowance?":owner":"");const usage=await one(env,"INSERT INTO growth_usage (day,count) VALUES (?,1) ON CONFLICT(day) DO UPDATE SET count=count+1 RETURNING count",day);
      if(usage.count>10){await run(env,"UPDATE growth_assessments SET status='draft' WHERE id=?",row.id);return json({error:"Today's report capacity has been reached. Your answers are saved; please try tomorrow or contact Vlad."},429);}
      try{
        const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:["get-better-leads","close-more-deals","save-time","repeat-business","profitability"].includes(row.category)?"gpt-5.4":"gpt-5.4-mini",background:true,store:true,max_output_tokens:10000,instructions:ASSESSMENT_INSTRUCTIONS+"\n\nOUTPUT SCOPE AND FORMAT:\n"+INSTRUCTIONS+"\n\nCATEGORY REQUIREMENTS:\n"+CATEGORY_GUIDANCE[row.category],input:JSON.stringify({category:categoryInfo(row.category).title,category_guidance:CATEGORY_GUIDANCE[row.category],answers:getQuestions(row.category).map(q=>({id:q.id,question:q.text,answer:answers[q.id]}))}),text:{format:{type:"json_schema",name:"growth_strategy",strict:true,schema:REPORT_SCHEMA}}}),signal:AbortSignal.timeout(20000)});
        if(!response.ok){await run(env,"UPDATE growth_assessments SET status='failed',error_code=? WHERE id=?",response.status===429?"api_quota_or_rate_limit":"api_rejected",row.id);return json({error:"The analysis service could not start your report. Your answers are saved."},503);}
        const value=await response.json();if(typeof value.id!=="string")throw new Error("missing_response_id");
        await run(env,"UPDATE growth_assessments SET response_id=?,status='analyzing',updated_at=? WHERE id=?",value.id,Date.now(),row.id);
      }catch{await run(env,"UPDATE growth_assessments SET status='uncertain',error_code='start_unconfirmed' WHERE id=? AND status='creating'",row.id);return json({error:"We could not confirm whether analysis started. Your answers are saved; please contact Vlad before retrying."},503);}
      return json({session:view(await one(env,"SELECT * FROM growth_assessments WHERE id=?",row.id))},202);
    }
    if(path==="/api/growth/status"&&req.method==="GET"){
      if(["creating","review_starting"].includes(row.status)&&Date.now()-row.updated_at>60000){await run(env,"UPDATE growth_assessments SET status='uncertain',error_code='start_unconfirmed' WHERE id=? AND status IN ('creating','review_starting')",row.id);row=await one(env,"SELECT * FROM growth_assessments WHERE id=?",row.id);}
      row=await poll(row,env);
      if(row.status==="ready"){await queueReport(env,row);if(ctx?.waitUntil)ctx.waitUntil(processGrowthDelivery(env).catch(()=>{}));}
      return json({session:view(row),delivery:await deliveryStatus(env,row.id)});
    }
    if(path==="/api/growth/download"&&["GET","HEAD"].includes(req.method)){
      if(row.status!=="ready"||!row.report_json)return json({error:"Your report is not ready yet."},409);
      const report=validateReport(JSON.parse(row.report_json));const pages=reportPages(report,JSON.parse(row.contact_json),JSON.parse(row.answers_json),{createdAt:new Date(row.created_at).toISOString()});
      const pdf=req.method==="HEAD"?null:await createReportPdf(pages,{createdAt:row.created_at});
      return new Response(pdf,{headers:{"Content-Type":"application/pdf","Content-Disposition":`inline; filename=${agentic?"Your_Agentic_Readiness_Report.pdf":"Your_Business_Strategy_Report.pdf"}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"}});
    }
    return json({error:"Not found."},404);
  }catch(e){const validation=/Please|Choose/.test(e.message||"");return json({error:validation?e.message:"We could not save or load this assessment. Please try again; keep this page open to preserve any unsaved answers."},validation?400:503);}
}

export async function maintainGrowth(env){
  const pending=await rows(env,"SELECT * FROM growth_assessments WHERE status IN ('analyzing','reviewing') ORDER BY last_poll LIMIT 3");
  for(const row of pending)await poll(row,env);
  const delivery=await processGrowthDelivery(env);
  const mailErrors=await rows(env,"SELECT error_code,COUNT(*) AS count FROM growth_delivery_jobs WHERE error_code IS NOT NULL GROUP BY error_code");
  return {checked:pending.length,delivery,mailErrors};
}
