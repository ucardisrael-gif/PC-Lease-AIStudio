import test from 'node:test';
import assert from 'node:assert/strict';
import {commissionForPayment,commissionRefundCorrection,defaultCommissionPeriod} from '../commission-math.mjs';

test('commission amounts are rounded in agorot per payment and refunds cannot overcorrect',()=>{
 assert.equal(commissionForPayment(10000,1000),1000);
 assert.equal(commissionForPayment(9999,300),300);
 assert.equal(commissionRefundCorrection(10000,1000,0,4000),400);
 assert.equal(commissionForPayment(10000,1000)-commissionRefundCorrection(10000,1000,0,4000),600);
 assert.equal(commissionRefundCorrection(101,5000,0,50)+commissionRefundCorrection(101,5000,50,51),commissionForPayment(101,5000));
 assert.throws(()=>commissionRefundCorrection(10000,1000,9000,1001),/invalid_input/);
 assert.throws(()=>commissionForPayment(10000,10001),/invalid_input/);
});
test('default commission term starts at first payment and ends the day before its anniversary',()=>{
 assert.deepEqual(defaultCommissionPeriod('2026-01-01',36),{startsOn:'2026-01-01',endsOn:'2028-12-31'});
 assert.deepEqual(defaultCommissionPeriod('2024-02-29',12),{startsOn:'2024-02-29',endsOn:'2025-02-27'});
 assert.deepEqual(defaultCommissionPeriod('2026-01-31',1),{startsOn:'2026-01-31',endsOn:'2026-02-27'});
 assert.throws(()=>defaultCommissionPeriod('2026-02-30',36),/invalid_input/);
});
