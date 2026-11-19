export function accountPrincipal(a, date) {
  if (a.initialPrincipal === null || !a.principalDate || a.principalDate > date) return null;
  return a.flows.filter(f => f.date > a.principalDate && f.date <= date)
    .reduce((sum, f) => sum + (f.type === '납입' ? f.amount : f.type === '출금' ? -f.amount : 0), a.initialPrincipal);
}
export function monthlyTarget(a, month) {
  return a.targets.filter(t => t.month <= month).sort((a,b) => b.month.localeCompare(a.month))[0]?.amount ?? null;
}
/** Position cost in KRW requires recorded historical FX, which is not collected. */
export function positionTotals(a, quotes, fx) {
  if (!a.holdings.length) return null;
  let cost=0, value=0, hasCost=true, hasValue=true;
  for (const h of a.holdings) {
    const quantity=Number(h.quantity), q=quotes[h.symbol];
    if (h.currency === 'KRW') cost+=Number(h.averagePrice)*quantity; else hasCost=false;
    if (!q || q.currency !== h.currency || !Number.isFinite(q.price) || q.price <= 0 || (h.currency === 'USD' && !(fx>0))) hasValue=false;
    else value+=q.price*quantity*(h.currency === 'USD' ? fx : 1);
  }
  return {cost:hasCost?Math.round(cost):null,value:hasValue?Math.round(value):null};
}
/** Annual-rate approximation; each maturity transfers only that account's balance. */
export function simulate(accounts, startValues, options) {
  const {startYear,startMonth,years,investmentRate,increaseAt,increase,monthlyTargets}=options;
  const states=accounts.map((account,i)=>({account,value:startValues[i],contributions:0,transferred:false}));
  const rows=[];const start=startValues.reduce((a,b)=>a+b,0);
  for(let n=1;n<=years*12;n++) {
    const at=new Date(Date.UTC(startYear,startMonth-1+n,1));
    const ym=`${at.getUTCFullYear()}-${String(at.getUTCMonth()+1).padStart(2,'0')}`;
    for(const state of states) {
      const expired=!!state.account.maturity && ym>state.account.maturity.slice(0,7);
      if(expired){
        if(state.account.reinvest && !state.transferred) {
          const destination=states.find(x=>x!==state && x.account.type==='투자' && (!x.account.maturity || ym<=x.account.maturity.slice(0,7)));
          if(destination){destination.value+=state.value;state.value=0;state.transferred=true;}
        }
        continue;
      }
      const annual=state.account.type==='저축'?state.account.rate:investmentRate;
      const contribution=Math.max(0,(monthlyTargets[state.account.id]??0)+(increaseAt>0 && n>=increaseAt?increase:0));
      state.value=state.value*Math.pow(1+annual/100,1/12)+contribution;
      state.contributions+=contribution;
    }
    if(at.getUTCMonth()===11||n===years*12){
      const value=states.reduce((sum,x)=>sum+x.value,0),paid=start+states.reduce((sum,x)=>sum+x.contributions,0);
      rows.push({name:`${at.getUTCFullYear()}년 ${at.getUTCMonth()+1}월`,원금:Math.round(paid),수익:Math.round(value-paid),자산:Math.round(value)});
    }
  }
  return rows;
}
/** Holdings without dates remain visible but are never assigned to a month. */
export function holdingsForMonth(accounts, month) {
  return accounts.flatMap(a=>a.holdings).filter(h=>!h.purchaseDate || h.purchaseDate.startsWith(month));
}
/** Current asset summary is independent of the selected reporting month. */
export function currentAssetValues(accounts, date, quotes, fx) {
  return accounts.map(account=>({account,value:account.type==='투자'&&account.holdings.length?positionTotals(account,quotes,fx)?.value??null:account.type==='저축'?accountPrincipal(account,date):null,positions:account.type==='투자'&&account.holdings.length>0}));
}
/** Monthly estimates use only dated, currently held KRW positions and known closes. */
export function investmentTimeline(year, asOfDate, holdings, history, quotes, fx) {
  const currentMonth=asOfDate.slice(0,7);
  const complete=holdings.length>0&&holdings.every(h=>h.currency==='KRW'&&/^\d{4}-\d{2}-\d{2}$/.test(h.purchaseDate)&&h.purchaseDate<=asOfDate);
  const activeNow=holdings.filter(h=>!h.purchaseDate||h.purchaseDate<=asOfDate);
  const current=positionTotals({holdings:activeNow},quotes,fx);
  return Array.from({length:12},(_,index)=>{
    const month=`${year}-${String(index+1).padStart(2,'0')}`;
    const lastDay=String(new Date(Date.UTC(Number(year),index+1,0)).getUTCDate()).padStart(2,'0');
    const cutoff=month===currentMonth?asOfDate:`${month}-${lastDay}`;
    const row={name:`${index+1}월`,'누적 투자 원금':null,'총 평가금액':null};
    if(month>currentMonth)return row;
    if(complete){
      const active=holdings.filter(h=>h.purchaseDate<=cutoff);
      if(active.length){
        row['누적 투자 원금']=Math.round(active.reduce((sum,h)=>sum+Number(h.quantity)*Number(h.averagePrice),0));
        let value=0,priced=true;
        for(const h of active){
          const records=history[h.symbol];
          if(!records||records.currency!==h.currency){priced=false;break}
          const candidates=records.prices.filter(p=>p.date<=cutoff&&p.date>=h.purchaseDate).sort((a,b)=>b.date.localeCompare(a.date));
          const quote=candidates[0];
          const age=quote?(Date.parse(`${cutoff}T00:00:00Z`)-Date.parse(`${quote.date}T00:00:00Z`))/86400000:Infinity;
          if(!quote||age>10){priced=false;break}
          value+=quote.close*Number(h.quantity);
        }
        if(priced)row['총 평가금액']=Math.round(value);
      }
    }
    if(month===currentMonth&&current){
      if(current.cost!==null)row['누적 투자 원금']=current.cost;
      if(current.value!==null)row['총 평가금액']=current.value;
    }
    return row;
  });
}

/** Account valuations and complete or explicitly partial asset totals. */
export function assetGrowthTimeline(year, asOfDate, accounts, history, quotes, fx) {
  const investments=new Map(accounts.filter(a=>a.type==='투자').map(a=>[a.id,investmentTimeline(year,asOfDate,a.holdings,history,quotes,fx)]));
  return Array.from({length:12},(_,i)=>{
    const month=`${year}-${String(i+1).padStart(2,'0')}`;
    const last=String(new Date(Date.UTC(Number(year),i+1,0)).getUTCDate()).padStart(2,'0');
    const cutoff=month===asOfDate.slice(0,7)?asOfDate:`${month}-${last}`;
    const row={name:`${i+1}월`,'총자산':null,'확인된 자산':null};
    let sum=0,known=0,missing=0;
    for(const a of accounts){
      const applicable=month<=asOfDate.slice(0,7)&&(!a.openedAt||a.openedAt<=cutoff);
      const value=!applicable?null:a.type==='투자'?investments.get(a.id)[i]['총 평가금액']:accountPrincipal(a,cutoff);
      row[`계좌 ${a.id}`]=value;
      if(applicable){if(value===null)missing++;else{known++;sum+=value}}
    }
    if(known&&!missing)row['총자산']=sum;
    else if(known)row['확인된 자산']=sum;
    return row;
  });
}
