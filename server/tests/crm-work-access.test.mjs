import {test} from 'node:test';import assert from 'node:assert/strict';import {crmPermissions,crmCardVisible} from '../crm-work-access.mjs';
test('CRM access is denied without permission and respects role or user visibility',()=>{
 const u={id:'u1',role:'customer',permissions:['crm_boards_view','crm_cards_view_all']};
 assert.equal(crmPermissions({id:'u1',role:'customer',permissions:['orders']}),null);
 assert.equal(crmPermissions(u,'invalid'),null);
 assert.equal(crmCardVisible(crmPermissions(u),{assigned_user_id:'u2'}),true);
 assert.equal(crmCardVisible(crmPermissions(u,'own'),{assigned_user_id:'u2'}),false);
 assert.equal(crmCardVisible(crmPermissions(u,'own'),{assigned_user_id:'u1'}),true);
 assert.equal(crmCardVisible(crmPermissions({...u,permissions:['crm_boards_view']},'all'),{assigned_user_id:'u2'}),true);
 assert.equal(crmPermissions({id:'admin',role:'admin'},'own').all,true);
 assert.equal(crmPermissions({...u,permissions:['crm_cards_edit']}),null);
});
