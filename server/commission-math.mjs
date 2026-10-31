// Integer agorot and hundredths of a percentage point avoid floating-point drift.
const validAmount=x=>Number.isSafeInteger(x)&&x>=0&&x<=1_000_000_000;
export function commissionForPayment(amountMinor,percentHundredths){
 if(!validAmount(amountMinor)||!Number.isInteger(percentHundredths)||percentHundredths<0||percentHundredths>10000)throw Error('invalid_input');
 return Math.floor((amountMinor*percentHundredths+5000)/10000);
}
// Calculate the *incremental* correction from the cumulative refund. This
// prevents repeated partial refunds accumulating more rounding than a full refund.
export function commissionRefundCorrection(amountMinor,percentHundredths,refundedBefore,refundMinor){
 if(!validAmount(amountMinor)||amountMinor===0||!validAmount(refundedBefore)||!validAmount(refundMinor)||refundedBefore+refundMinor>amountMinor)throw Error('invalid_input');
 return commissionForPayment(amountMinor-refundedBefore,percentHundredths)-commissionForPayment(amountMinor-refundedBefore-refundMinor,percentHundredths);
}

// Dates are calendar dates in Israel, not instants. The end date is inclusive.
// An anniversary beyond a short month is clamped to its last calendar day.
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!v.startsWith('0000')&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
export function defaultCommissionPeriod(firstPayment,months){
 if(!validDate(firstPayment)||!Number.isInteger(months)||months<1||months>1200)throw Error('invalid_input');
 const [year,month,day]=firstPayment.split('-').map(Number);
 const target=year*12+(month-1)+months;
 const targetYear=Math.floor(target/12),targetMonth=target%12;
 if(targetYear>9999)throw Error('invalid_input');
 const last=new Date(0);last.setUTCFullYear(targetYear,targetMonth+1,0);last.setUTCHours(0,0,0,0);
 const anniversary=new Date(0);anniversary.setUTCFullYear(targetYear,targetMonth,Math.min(day,last.getUTCDate()));anniversary.setUTCHours(0,0,0,0);
 anniversary.setUTCDate(anniversary.getUTCDate()-1);
 return {startsOn:firstPayment,endsOn:anniversary.toISOString().slice(0,10)};
}
