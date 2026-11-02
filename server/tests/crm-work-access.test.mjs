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
test('legacy card editing preserves old rights; granular permissions do not imply unrelated actions',()=>{
 const user=permissions=>crmPermissions({id:'u1',role:'customer',permissions:['crm_boards_view',...permissions]});
 assert.deepEqual([user(['crm_cards_edit']).create,user(['crm_cards_edit']).edit,user(['crm_cards_edit']).move],[true,true,true]);
 assert.deepEqual([user(['crm_cards_create']).create,user(['crm_cards_create']).edit,user(['crm_cards_create']).move],[true,false,false]);
 assert.deepEqual([user(['crm_cards_update']).create,user(['crm_cards_update']).edit,user(['crm_cards_update']).move],[false,true,false]);
 assert.deepEqual([user(['crm_cards_move']).create,user(['crm_cards_move']).edit,user(['crm_cards_move']).move],[false,false,true]);
});
test('structure permissions preserve legacy management and remain independent',()=>{
 const user=permissions=>crmPermissions({id:'u1',role:'customer',permissions:['crm_boards_view',...permissions]});
 const all=user(['crm_boards_manage']);assert.deepEqual([all.boardCreate,all.boardEdit,all.columnCreate,all.columnEdit,all.fieldCreate,all.fieldEdit],[true,true,true,true,true,true]);
 const narrow=user(['crm_columns_create','crm_fields_update']);assert.deepEqual([narrow.boardCreate,narrow.boardEdit,narrow.columnCreate,narrow.columnEdit,narrow.fieldCreate,narrow.fieldEdit],[false,false,true,false,false,true]);
});
