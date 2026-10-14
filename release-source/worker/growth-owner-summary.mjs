// Build the owner's CRM brief from saved answers and the approved report only.
// No CRM writes, extra AI calls, or inferred purchase commitments.
export function ownerSummary(contact, report, answers, category, assessmentId) {
 const missing='Needs confirmation';
 const reportTitle=category==='Agentic Readiness'?'Agentic Readiness Report':'Business Strategy Report';
 const value=x=>Array.isArray(x)?x.join(', '):x||missing;
 const name=contact.full_name.trim();
 const parts=name.split(/\s+/);
 const first=parts.length===2?parts[0]:missing;
 const last=parts.length===2?parts[1]:missing;
 const fields=entries=>entries.map(([k,v])=>`${k}: ${value(v)}`).join('\n');
 return `NEW ${reportTitle.toUpperCase()}\n\n${fields([
 ['Name',name],['Company',contact.business_name],['Email',contact.email],['Phone',contact.phone],['Assessment priority',category],['Assessment ID',assessmentId]
 ])}\n\nPERSON AND BUSINESS\nBusiness and customers (their answer): ${value(answers.Q1)}\n90-day goal (their answer): ${value(answers.Q9)}\nTime available each week (their answer): ${value(answers.Q10)}\n\nREPORT SUMMARY\n${report.headline}\n\n${report.summary}\n\nKEY FINDINGS\n${report.findings.map((f,i)=>`${i+1}. ${f.title}\n${f.observation}\nRecommended first step: ${f.next_step}\nConfidence: ${f.confidence}`).join('\n\n')}\n\nFIRST SEVEN DAYS\n${report.quick_win.title}\n${report.quick_win.steps.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\n30–60–90-DAY PLAN\n${report.roadmap.map(r=>`${r.phase}: ${r.focus}`).join('\n')}\n\nDETAILS TO CONFIRM\n${report.assumptions.map(a=>`• ${a}`).join('\n')}\n\nBIGIN — CONTACT\n${fields([
 ['Full name',name],['First name',first],['Last name',last],['Name split',parts.length===2?'Suggested split; confirm before entry':missing],['Email',contact.email],['Phone',contact.phone],['Title or role',missing],['Company',contact.business_name],['Mailing address or location',missing],['Contact source',`Set Up Shop Online website — Free ${reportTitle}`],['Contact owner','Vlad Gutenmakher'],['Contact notes',`Completed the ${category} assessment. Goal: ${value(answers.Q9)}. Report ID: ${assessmentId}. No review booking or purchase confirmed.`]
 ])}\n\nBIGIN — COMPANY\n${fields([
 ['Company name',contact.business_name],['Website',missing],['Industry or business type',missing],['Phone',`${missing} — submitted contact phone: ${contact.phone}`],['Address or location',missing],['Company owner','Vlad Gutenmakher'],['Company description',value(answers.Q1)]
 ])}\n\nBIGIN — DEAL\n${fields([
 ['Deal name',`${name} – Strategy Review – ${category}`],['Contact',name],['Company',contact.business_name],['Amount',`${missing} — free report; paid work has not been agreed`],['Service','Free Strategy Review; possible paid strategy work only if separately agreed'],['Term or scope','Review the assessment findings and discuss a suitable next step'],['Frequency or deliverables','Optional review call; booking not confirmed'],['Start date',missing],['Expected closing or end date',missing],['Deal stage',`${missing} — assessment completed; not a confirmed paid opportunity`],['Deal source',`Set Up Shop Online website — Free ${reportTitle}`],['Deal owner','Vlad Gutenmakher'],['Next action','Review the findings, check for an existing Bigin contact/company/deal, then follow up about the optional free Strategy Review'],['Next action date',missing],['Deal description',`Assessment priority: ${category}. Goal: ${value(answers.Q9)}. Recommended first priority: ${report.opportunities[0].title}. Assessment ID: ${assessmentId}.`],['Exclusions','No booking, budget, paid scope, start date, purchase, or contract is confirmed by submitting this assessment.']
 ])}\n\nThese are prepared details for Bigin; no CRM records have been created. The report is AI-generated from self-reported answers using the SUSO Framework and Custom Assessment methodology and passed an automated quality check. Confirm recommendations and missing CRM details before acting.`;
}
