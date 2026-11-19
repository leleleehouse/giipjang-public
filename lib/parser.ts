import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import {createHash} from 'crypto';
const clean=(v:unknown)=>String(v??'').normalize('NFC').trim();
const category=(v:unknown)=>clean(v).replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu,'').trim()||'미분류';
export async function parseFile(buffer:Buffer){
 const zip=await JSZip.loadAsync(buffer); for(const name of Object.keys(zip.files).filter(n=>n.endsWith('.xml'))){const file=zip.file(name);if(file){const xml=await file.async('string');zip.file(name,xml.replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(match,hex,decimal)=>{const code=parseInt(hex||decimal,hex?16:10);return code>0xffff?String.fromCodePoint(code):match}));}}
 const repaired=await zip.generateAsync({type:'nodebuffer'}); const book=XLSX.read(repaired,{type:'buffer',cellDates:false});
 const sheet=book.Sheets['편한가계부']; if(!sheet) throw Error('편한가계부 시트를 찾을 수 없습니다.');
 const rows=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:'',raw:true});
 const header=(rows[0]||[]).map(clean); const find=(s:string)=>header.indexOf(s);
 const keys=['날짜','자산','분류','소분류','내용','KRW','수입/지출']; for(const k of keys) if(find(k)<0) throw Error(`필수 열 ${k}을 찾을 수 없습니다.`);
 const out=[]; for(let i=1;i<rows.length;i++){const r=rows[i]; if(!r.some(x=>clean(x))) continue;
  const rawDate=r[find('날짜')]; let date='';
  if(typeof rawDate==='number'){const d=XLSX.SSF.parse_date_code(rawDate,{date1904:!!book.Workbook?.WBProps?.date1904});if(d) date=`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}T${String(d.H).padStart(2,'0')}:${String(d.M).padStart(2,'0')}:${String(Math.floor(d.S)).padStart(2,'0')}`;}
  else {const s=clean(rawDate).replace(/\./g,'-').replace(/\//g,'-').replace(/\s+/,'T'); const m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);if(m) date=`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}T${(m[4]||'00').padStart(2,'0')}:${m[5]||'00'}:${m[6]||'00'}`;}
  const parsedDate=new Date(date+'Z'); if(!date||Number.isNaN(parsedDate.valueOf())||parsedDate.toISOString().slice(0,10)!==date.slice(0,10)) throw Error(`${i+1}행: 날짜를 해석할 수 없습니다.`);
  const a=clean(r[find('KRW')]).replace(/,/g,''); const amount=Number(a); if(!a||!Number.isSafeInteger(amount)) throw Error(`${i+1}행: KRW 금액은 정수여야 합니다.`);
  const type=clean(r[find('수입/지출')]); if(!['수입','지출'].includes(type)) throw Error(`${i+1}행: 수입/지출 값이 올바르지 않습니다 (${type}).`);
  const t={date,asset:clean(r[find('자산')])||'미지정',category:category(r[find('분류')]),subcategory:clean(r[find('소분류')])||'미지정',description:clean(r[find('내용')]),amount:Math.abs(amount),type,memo:clean(r[find('메모')]),raw:JSON.stringify(r)};
  const fingerprint=createHash('sha256').update(JSON.stringify([t.date,t.asset,t.category,t.subcategory,t.description,t.amount,t.type])).digest('hex');out.push({...t,fingerprint});
 } return out;
}
