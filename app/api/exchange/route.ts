import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(){try{const response=await fetch('https://api.frankfurter.dev/v2/rate/usd/krw',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('환율 조회 실패');const d=await response.json();if(!Number.isFinite(d.rate)||d.rate<=0||typeof d.date!=='string')throw Error('환율 정보가 올바르지 않습니다.');return NextResponse.json({rate:d.rate,date:d.date,source:'Frankfurter'});}catch{return NextResponse.json({error:'USD/KRW 환율을 불러오지 못했습니다.'},{status:502})}}
