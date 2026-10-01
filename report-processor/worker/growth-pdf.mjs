import { PDFDocument, rgb, PDFName, PDFString } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import regularData from "./assets/report-regular.ttf";
import boldData from "./assets/report-bold.ttf";
import logoData from "./assets/growth-logo.png";
const bytes=b64=>Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
const blue=rgb(.071,.302,.6),navy=rgb(.063,.169,.306),ink=rgb(.098,.196,.286),muted=rgb(.314,.392,.471),pale=rgb(.93,.957,.989);
export const MAX_REPORT_PAGES = 15;
export async function createReportPdf(sections,options={}){
  for (const compact of [false,true]) {
    const result=await renderReportPdf(sections,{...options,compact});
    if(result.pageCount<=MAX_REPORT_PAGES)return result.bytes;
  }
  throw new Error('report_page_limit_exceeded');
}
async function renderReportPdf(sections,{createdAt,compact=false}={}){
  const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
  if(createdAt){const date=new Date(createdAt);pdf.setCreationDate(date);pdf.setModificationDate(date);}
  pdf.setTitle("Your Business Strategy Report | Set Up Shop Online");pdf.setAuthor("Set Up Shop Online, Inc.");
  const regular=await pdf.embedFont(bytes(regularData),{subset:true}),bold=await pdf.embedFont(bytes(boldData),{subset:true}),logo=await pdf.embedPng(bytes(logoData));
  const safe=t=>String(t).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,"");
  function wrap(text,font,size,width){const result=[];for(const paragraph of safe(text).split("\n")){if(!paragraph){result.push("");continue;}let line="";for(const word of paragraph.split(/\s+/)){if(font.widthOfTextAtSize(word,size)>width){if(line){result.push(line);line="";}let part="";for(const c of word){if(font.widthOfTextAtSize(part+c,size)>width){result.push(part);part="";}part+=c;}line=part;continue;}const next=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(next,size)>width){result.push(line);line=word;}else line=next;}if(line)result.push(line);}return result;}
  const link=(p,url,x,y,width,height)=>{const ref=pdf.context.register(pdf.context.obj({Type:"Annot",Subtype:"Link",Rect:[x,y,x+width,y+height],Border:[0,0,0],A:{Type:"Action",S:"URI",URI:PDFString.of(url)}}));p.node.addAnnot(ref);};
  for(const section of sections){let page,y;
    const start=continued=>{page=pdf.addPage([612,792]);page.drawRectangle({x:0,y:782,width:612,height:10,color:blue});const showCta=!!section.reviewCta&&!continued;
      if(showCta){
        page.drawRectangle({x:48,y:564,width:516,height:190,color:navy});
        page.drawText('Turn your findings into your next step.',{x:66,y:723,size:17,font:bold,color:rgb(1,1,1)});
        const copy='Bring your report to a free Strategy Review. We’ll review the findings, discuss your first step, and see whether paid strategy work would help.';
        wrap(copy,regular,10.5,480).forEach((line,i)=>page.drawText(line,{x:66,y:696-i*16,size:10.5,font:regular,color:rgb(.88,.93,1)}));
        page.drawRectangle({x:66,y:608,width:240,height:36,color:rgb(1,.6,0)});
        page.drawText('Book Free Strategy Review',{x:80,y:620,size:12,font:bold,color:navy});
        link(page,section.reviewCta,66,608,240,36);
        page.drawText('Your report is yours to keep. Booking is optional.',{x:66,y:584,size:10,font:regular,color:rgb(.88,.93,1)});
      }
      page.drawImage(logo,{x:508,y:showCta?481:697,width:56,height:56});let top=showCta?536:742;const kicker=wrap((section.kicker+(continued?" · CONTINUED":"")).toUpperCase(),bold,9,435);for(const line of kicker.slice(0,3)){page.drawText(line,{x:48,y:top,size:9,font:bold,color:blue});top-=13;}top-=compact?16:22;for(const line of wrap(section.title,bold,compact?23:27,444)){page.drawText(line,{x:48,y:top,size:compact?23:27,font:bold,color:navy});top-=compact?28:33;}y=Math.min(top-(compact?14:25),compact?678:642);};
    start(false);
    if (section.actionMap?.length) {
      page.drawText('YOUR ACTION MAP',{x:48,y,size:10,font:bold,color:blue});
      y -= 18;
      const steps = section.actionMap;
      const gap = 13;
      // Preserve the instructions after action labels, including additional colons.
      // Long steps use wider cards and continue on fresh pages without clipping.
      const narrowWidth = (516 - gap * (steps.length - 1)) / steps.length;
      const columns = steps.some(text => wrap(text, regular, 9, narrowWidth - 16).length > 12) ? 2 : steps.length;
      const width = (516 - gap * (columns - 1)) / columns;
      for (let offset = 0; offset < steps.length; offset += columns) {
        const summaries = steps.slice(offset, offset + columns).map(text => wrap(text, regular, 9, width - 16));
        const height = Math.max(100, 43 + Math.max(...summaries.map(lines => lines.length)) * 13);
        if (y - height < 130) { start(true); y -= 18; }
        summaries.forEach((lines, i) => {
          const x = 48 + i * (width + gap);
          page.drawRectangle({x,y:y-height,width,height,color:pale,borderColor:rgb(.78,.85,.94),borderWidth:.7});
          page.drawCircle({x:x+width/2,y:y-17,size:10,color:blue});
          const number = String(offset+i+1);
          page.drawText(number,{x:x+width/2-bold.widthOfTextAtSize(number,10)/2,y:y-20.5,size:10,font:bold,color:rgb(1,1,1)});
          lines.forEach((line,j)=>page.drawText(line,{x:x+8,y:y-40-j*13,size:9,font:regular,color:ink}));
          if(i<summaries.length-1){const ax=x+width+3, ay=y-height/2;
            page.drawLine({start:{x:ax,y:ay},end:{x:ax+7,y:ay},thickness:1,color:blue});
            page.drawLine({start:{x:ax+4,y:ay+3},end:{x:ax+7,y:ay},thickness:1,color:blue});
            page.drawLine({start:{x:ax+4,y:ay-3},end:{x:ax+7,y:ay},thickness:1,color:blue});
          }
        });
        y -= height + 16;
      }
      page.drawText('At a glance • Follow the numbered steps below for the full details.',{x:48,y,size:8.5,font:regular,color:muted});
      y -= 32;
    }
    const pageTop = () => Math.min(compact?678:642, y);
    let contentTop = pageTop();
    for (const block of section.blocks) {
      const titleLines = wrap(block.title, bold, 12.5, 516);
      const paragraphs = safe(block.text).split(/\n+/).filter(Boolean).map(text => {
        const match = text.match(/^(Why it matters|First step|Evidence|What you’ll have|Who will do it|How to check progress|Time and effort|Starting point|How to track):\s*(.*)$/);
        const separateLabel = match && (!compact || ["Why it matters","First step","Evidence"].includes(match[1]));
        const label = separateLabel ? match[1] : null;
        const detail = label === 'Evidence';
        const size = detail ? 9.5 : 10.5;
        const leading = detail ? 15 : compact ? 16 : 17;
        return { label, size, leading, detail, lines: wrap(separateLabel ? match[2] : text, regular, size, 516) };
      });
      const headingHeight = titleLines.length * 19 + 7;
      const totalHeight = headingHeight + paragraphs.reduce((sum,p) => sum + (p.label ? 17 : 0) + p.lines.length * p.leading + 9, 0);
      // Keep a complete finding/action together when it can fit on a fresh page.
      if ((totalHeight <= (contentTop - 90) * .30 && y - totalHeight < 90) || y - headingHeight - 51 < 90) {
        start(true); contentTop = pageTop();
      }
      const drawHeading = continued => {
        for (const line of wrap(block.title + (continued ? ' (continued)' : ''), bold, 12.5, 516)) {
          page.drawText(line,{x:48,y,size:12.5,font:bold,color:blue}); y -= 19;
        }
        y -= 7;
      };
      drawHeading(false);
      for (const paragraph of paragraphs) {
        const needed = (paragraph.label ? 17 : 0) + paragraph.lines.length * paragraph.leading;
        if (y - Math.min(needed, contentTop - headingHeight - 90) < 90) { start(true); contentTop = pageTop(); drawHeading(true); }
        if (paragraph.label) { page.drawText(paragraph.label,{x:48,y,size:9.5,font:bold,color:paragraph.detail?muted:blue}); y -= 17; }
        for (const line of paragraph.lines) {
          if (y < 90) { start(true); contentTop = pageTop(); drawHeading(true); }
          page.drawText(line,{x:48,y,size:paragraph.size,font:regular,color:block.link?blue:paragraph.detail?muted:ink});
          if(block.link)link(page,block.link,48,y-3,Math.min(516,regular.widthOfTextAtSize(line,paragraph.size)),paragraph.leading);
          y -= paragraph.leading;
        }
        y -= 9;
      }
      y -= compact ? 10 : 17;
    }
  }
  const pages=pdf.getPages();for(let i=0;i<pages.length;i++){const p=pages[i];p.drawRectangle({x:48,y:63,width:516,height:1,color:pale});p.drawText("Set Up Shop Online, Inc.",{x:48,y:48,size:8,font:regular,color:muted});p.drawText("Business Strategy & AI Consulting | SetUpShopOnline.com",{x:48,y:35,size:8,font:regular,color:muted});p.drawText("Vlad@SetupShopOnline.com | 201-757-0134",{x:48,y:22,size:8,font:regular,color:muted});p.drawText(`${i+1} / ${pages.length}`,{x:526,y:22,size:8,font:bold,color:blue});link(p,"https://setupshoponline.com",48,31,290,12);link(p,"mailto:Vlad@SetupShopOnline.com",48,18,132,12);link(p,"tel:+12017570134",188,18,95,12);}
  return {bytes:await pdf.save(),pageCount:pages.length};
}
