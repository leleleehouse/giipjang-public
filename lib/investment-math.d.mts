type A={type:string;initialPrincipal:number|null;principalDate:string;flows:{date:string;type:string;amount:number}[];targets:{month:string;amount:number}[];holdings:{symbol:string;quantity:string;averagePrice:string;currency:string}[]};
export function accountPrincipal(a:A,date:string):number|null;
export function monthlyTarget(a:A,month:string):number|null;
export function positionTotals(a:A,quotes:Record<string,{price:number;currency:string}>,fx:number|null):{cost:number|null;value:number|null}|null;
export function simulate(accounts:(A&{id:number;maturity:string;reinvest:boolean;rate:number})[],startValues:number[],options:{startYear:number;startMonth:number;years:number;investmentRate:number;increaseAt:number;increase:number;monthlyTargets:Record<number,number>}):{name:string;원금:number;수익:number;자산:number}[];
export function holdingsForMonth<T extends {purchaseDate:string}>(accounts:{holdings:T[]}[],month:string):T[];
export function currentAssetValues<T extends A>(accounts:T[],date:string,quotes:Record<string,{price:number;currency:string}>,fx:number|null):{account:T;value:number|null;positions:boolean}[];
export function investmentTimeline(year:string,asOfDate:string,holdings:{symbol:string;currency:string;purchaseDate:string;quantity:string;averagePrice:string}[],history:Record<string,{currency:string;prices:{date:string;close:number}[]}>,quotes:Record<string,{price:number;currency:string}>,fx:number|null):{name:string;'누적 투자 원금':number|null;'총 평가금액':number|null}[];

export function assetGrowthTimeline(year:string,asOfDate:string,accounts:(A & {id:number;openedAt:string;holdings:{symbol:string;currency:string;purchaseDate:string;quantity:string;averagePrice:string}[]})[],history:Record<string,{currency:string;prices:{date:string;close:number}[]}>,quotes:Record<string,{price:number;currency:string}>,fx:number|null):Record<string,string|number|null>[];
