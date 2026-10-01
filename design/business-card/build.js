const fs=require('fs'),QR=require('qrcode');const {chromium}=require('playwright-core');
const f=p=>fs.readFileSync(p).toString('base64');
const FB='node_modules/@fontsource/';
const fonts=`@font-face{font-family:B;font-weight:700;src:url(data:font/woff2;base64,${f(FB+'bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff2')})}
@font-face{font-family:B;font-weight:800;src:url(data:font/woff2;base64,${f(FB+'bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff2')})}
@font-face{font-family:G;font-weight:500;src:url(data:font/woff2;base64,${f(FB+'geist-sans/files/geist-sans-latin-500-normal.woff2')})}
@font-face{font-family:G;font-weight:600;src:url(data:font/woff2;base64,${f(FB+'geist-sans/files/geist-sans-latin-600-normal.woff2')})}`;
const URL='https://kaleerson.com/card';
(async()=>{
const qr=await QR.toString(URL,{type:'svg',errorCorrectionLevel:'Q',margin:0,color:{dark:'#1E3A2C',light:'#0000'}});
// 3.5x2in trim + 0.125in bleed each side = 3.75x2.25in ; 1in = 96px
const base=`<style>${fonts}
*{margin:0;padding:0;box-sizing:border-box}
@page{size:3.75in 2.25in;margin:0}
html,body{width:3.75in;height:2.25in}
.card{position:relative;width:3.75in;height:2.25in;overflow:hidden}
.blob{position:absolute;border-radius:58% 42% 51% 49% / 46% 55% 45% 54%}
.trim{position:absolute;inset:.125in;outline:.5px dashed #f0f;pointer-events:none}
.safe{position:absolute;inset:.25in;outline:.5px dashed #0bf;pointer-events:none}
</style>`;
const front=`${base}<div class="card" style="background:#1E3A2C">
 <span class="blob" style="width:1.95in;height:1.95in;right:-.55in;top:-.6in;background:#CFE0B4"></span>
 <span class="blob" style="width:1.05in;height:1.05in;right:.62in;top:.62in;background:#F3E39B;border-radius:41% 59% 39% 61% / 57% 39% 61% 43%"></span>
 <span class="blob" style="width:.58in;height:.58in;right:.22in;bottom:.18in;background:#C4D9F5;border-radius:62% 38% 55% 45% / 40% 60% 40% 60%"></span>
 <span class="blob" style="width:.3in;height:.3in;right:1.62in;top:.3in;background:#F6CDBB"></span>
 <div style="position:absolute;left:.32in;top:.3in;font:600 6.5pt G,sans-serif;letter-spacing:.14em;color:#B9C9AE;text-transform:uppercase">Founder · Builder</div>
 <div style="position:absolute;left:.3in;bottom:.5in;font:800 34pt/.86 B,sans-serif;letter-spacing:-.045em;color:#EAF2DA">Kale<br>Erson</div>
 <div style="position:absolute;left:.32in;bottom:.3in;font:500 7pt G,sans-serif;color:#B9C9AE">Las Vegas, Nevada</div>
 GUIDES</div>`;
const back=`${base}<div class="card" style="background:#EEF0EA">
 <span class="blob" style="width:1.3in;height:1.3in;left:-.6in;bottom:-.92in;background:#CFE0B4"></span>
 <span class="blob" style="width:.42in;height:.42in;left:1.5in;bottom:-.14in;background:#F6CDBB;border-radius:41% 59% 39% 61% / 57% 39% 61% 43%"></span>
 <span class="blob" style="width:.7in;height:.7in;right:-.2in;top:-.28in;background:#C4D9F5"></span>
 <div style="position:absolute;left:.32in;top:.3in;font:600 6.5pt G,sans-serif;letter-spacing:.14em;color:#5E645B;text-transform:uppercase">Scan me</div>
 <div style="position:absolute;left:.3in;top:.47in;font:800 17pt/.95 B,sans-serif;letter-spacing:-.04em;color:#141613">Website<br>&amp; contact</div>
 <div style="position:absolute;left:.32in;top:1.14in;font:600 7.5pt G,sans-serif;color:#141613">kaleerson.com</div>
 <div style="position:absolute;left:.32in;top:1.42in;font:600 5.5pt G,sans-serif;letter-spacing:.14em;color:#5E645B;text-transform:uppercase">Contact code</div>
 <div style="position:absolute;left:.32in;top:1.8in;width:1.5in;border-top:.9pt solid #141613"></div>
 <div style="position:absolute;right:.3in;top:50%;transform:translateY(-50%);width:1.42in;height:1.42in;background:#fff;border-radius:.2in;padding:.13in">${qr.replace('<svg','<svg style="width:100%;height:100%;display:block"')}</div>
 GUIDES</div>`;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const [name,html] of [['front',front],['back',back]]){
  for(const guides of [false,true]){
    const page=await b.newPage({viewport:{width:360,height:216},deviceScaleFactor:600/96});
    await page.setContent(html.replace('GUIDES',guides?'<div class="trim"></div><div class="safe"></div>':''));await page.evaluate(()=>document.fonts.ready);
    if(!guides){await page.pdf({path:`kale-card-${name}.pdf`,width:'3.75in',height:'2.25in',printBackground:true});await page.screenshot({path:`kale-card-${name}.png`})}
    else await page.screenshot({path:`preview-${name}.png`});
    await page.close()}}
// combined 2-page PDF for printers
const page=await b.newPage();await page.setContent(front.replace('GUIDES','')+'<div style="break-before:page"></div>'+back.replace('GUIDES','').replace(base,''));await page.evaluate(()=>document.fonts.ready);
await page.pdf({path:'kale-business-card.pdf',width:'3.75in',height:'2.25in',printBackground:true});
await b.close();console.log('done')})();
