import {NextRequest,NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const raw=(req.nextUrl.searchParams.get('symbol')||'').trim().toUpperCase();
 const symbol=/^\d{6}(?:\.K)?$/.test(raw)?`${raw.slice(0,6)}.KS`:raw;
 const year=Number(req.nextUrl.searchParams.get('year'));
 const currentYear=Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric'}).format(new Date()));
 if(!/^[A-Z0-9][A-Z0-9.\-]{0,19}$/.test(symbol)||!Number.isInteger(year)||year<1970||year>currentYear)return NextResponse.json({error:'종목 또는 조회 연도를 확인해 주세요.'},{status:400});
 const start=Math.floor(Date.UTC(year,0,1)/1000)-14*86400;
 const end=Math.min(Math.floor(Date.UTC(year+1,0,2)/1000),Math.floor(Date.now()/1000)+86400);
 try{
  const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${end}&interval=1d`;
  const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('과거 종가를 불러오지 못했습니다.');
  const data=await response.json(),result=data.chart?.result?.[0],meta=result?.meta,times=result?.timestamp,closes=result?.indicators?.quote?.[0]?.close;
  if(!meta||!Array.isArray(times)||!Array.isArray(closes))throw Error('과거 종가가 없습니다.');
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:meta.exchangeTimezoneName||'UTC',year:'numeric',month:'2-digit',day:'2-digit'});
  const prices=times.flatMap((time:number,i:number)=>Number.isFinite(time)&&Number.isFinite(closes[i])&&closes[i]>0?[{date:formatter.format(new Date(time*1000)),close:closes[i]}]:[]);
  if(!prices.length)throw Error('과거 종가가 없습니다.');
  return NextResponse.json({symbol:meta.symbol,currency:meta.currency,prices,source:'Yahoo Finance'});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'과거 종가를 불러오지 못했습니다.'},{status:502})}
}
