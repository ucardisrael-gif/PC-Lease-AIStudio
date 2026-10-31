import {getDealerClientLink,saveDealerClientLink} from './dealer-clients.mjs';
import {listLeaseSettings,saveLeaseSettings} from './lease-plans.mjs';
import {getPublicLeaseOptions,previewLeaseSelection} from './lease-selection.mjs';
import {listCommissionRates,saveCommissionRate} from './dealer-commission-rates.mjs';
import {getCommissionTerms,saveCommissionTerms} from './dealer-commission-terms.mjs';
import {listCommissionManualEntries,saveCommissionManualEntry} from './dealer-commission-manual.mjs';
import {commissionWork,reconcileCommissionPayment} from './commission-work.mjs';
import {attachCommissionRefund} from './commission-refunds.mjs';
import {commissionBalance} from './commission-balance.mjs';
import {getDealerAccess,setDealerAccess,listOwnDealerOrders} from './dealer-access.mjs';
import {listAccessRoles,saveAccessRole,assignAccessRoles,deleteAccessRole,listAccessRoleHistory} from './access-roles.mjs';
import { createServer } from 'node:http';
import { openDatabase } from './database.mjs';
import { getCatalog } from './catalog.mjs';
import { previewQuote } from './quote-preview.mjs';
import { saveMultiQuote } from './multi-quote.mjs';
import { renderQuotePdf } from './quote-pdf.mjs';
import { createOfferPdf, sendOffer } from './offer.mjs';
import { saveRequest } from './requests.mjs';
import { createMailer } from './mail.mjs';
import {saveContactInquiry,listContactInquiries,changeContactStatus,listInquiryHistory} from './contact-inquiries.mjs';
import {retryInquiryNotification,sendInitialInquiryNotification,resolvePendingInquiryNotification} from './inquiry-notification.mjs';
import {retryRequestNotification,sendInitialRequestNotification,resolvePendingRequestNotification} from './request-notification.mjs';
import {getOrderNotificationSettings,saveOrderNotificationSettings,listOrderNotificationSettingsHistory} from './order-notification-settings.mjs';
import { listAdminProducts, saveAdminProduct, createAdminProduct, listProductHistory } from './admin-products.mjs';
import { listUsers, listUserOrganizationHistory, changeUserRole, saveOwnUserProfile, saveUserProfileAsAdmin, linkUserOrganization, saveStaffPermissions, listAccessHistory, setUserActive } from './admin-users.mjs';
import { changeRequestStatus, listRequests, listRequestStatusHistory, listRequestLinkHistory, listRequestNotificationHistory, linkRequestOrganization,searchRequestCustomers,linkRequestCustomer } from './admin-requests.mjs';
import { listRequestNotes, createRequestNote } from './request-notes.mjs';
import { listOrganizations, saveOrganization, listOrganizationHistory, searchOrderCompanies } from './admin-organizations.mjs';
import {listDealers,saveDealer,listDealerHistory,listDealerOrders} from './dealers.mjs';
import {getRequestDealer,linkRequestDealer} from './request-dealer.mjs';
import { inventoryProducts, listInventory, listInventoryHistory, saveInventoryAsset } from './inventory.mjs';
import {getReservations,changeReservation,getReservationHistoryPage} from './reservations.mjs';
import {findPurchaseAsset,savePurchaseDetails,listPurchaseHistory} from './asset-purchase.mjs';
import {listServiceTickets,listServiceHistory,listReplacementHistory,saveServiceTicket} from './service-tickets.mjs';
import {changeServiceReplacement} from './service-replacements.mjs';
import {listContracts,listContractHistory,saveContractDraft,getContractVersion,reviewContractDraft} from './contracts.mjs';
import {addContractDocument,listContractDocuments,readContractDocument,contractDocumentStatus,changeDocumentKind,listDocumentKindHistory} from './contract-documents.mjs';
import {renderContractDraft} from './contract-pdf.mjs';
import {listFinancialEntries,createFinancialEntry,correctFinancialDate,correctFinancialAmount,searchFinanceOrders,getFinancialSummary} from './finance.mjs';
import {uploadProductMedia,readProductMedia} from './product-media.mjs';
import {listCustomerOrders,getCustomerOrderPdfRecord} from './customer-orders.mjs';
import {sendVerification,confirmVerification} from './email-verification.mjs';
import {getDashboard} from './dashboard.mjs';
import { register, login, logout, currentUser, beginReset, finishReset } from './auth.mjs';
import { getTrust, saveTrust, getHero, saveHero, getSection, saveSection } from './site-blocks.mjs';
import {saveSiteBlockWithHistory,listSiteBlockHistory} from './site-history.mjs';
import { getServerConfig } from './hosting-config.mjs';
import {getTaxSettings,saveTaxSettings,listTaxSettingsHistory} from './tax-settings.mjs';
import { pruneRateLimitBuckets } from './rate-limit-cleanup.mjs';
import {withRequestSession} from './transaction-permissions.mjs';
import express from 'express';
import { fileURLToPath } from 'node:url';

const config = getServerConfig();
const { port } = config;
const frontend = express();
const distPath = fileURLToPath(new URL('../dist/', import.meta.url));
if (config.hosted) {
  frontend.disable('x-powered-by');
  frontend.use(express.static(distPath, { fallthrough: true, dotfiles: 'deny' }));
  frontend.get(['/catalog', '/about', '/contact'], (_req, res) => res.sendFile('index.html', { root: distPath }));
}
const db = await openDatabase(process.env.PC_LEASE_DATABASE_URL);
const mailer = process.env.PC_LEASE_MAIL_USER && process.env.PC_LEASE_MAIL_APP_PASSWORD ? createMailer({ user: process.env.PC_LEASE_MAIL_USER, password: process.env.PC_LEASE_MAIL_APP_PASSWORD }) : null;
const recentRequests = new Map();
const authRequests = new Map();
const rateLimitCleanup = setInterval(() => {
  const now = Date.now();
  pruneRateLimitBuckets(recentRequests, now);
  pruneRateLimitBuckets(authRequests, now);
}, 60000);
rateLimitCleanup.unref();
const sessionToken = req => (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('pclease_session='))?.slice('pclease_session='.length);
const allowedOrigin = req => config.origins.includes(req.headers.origin);
const can = (user,permission) => !!user && (user.role === 'admin' || user.permissions?.includes(permission));
async function readJson(req, maxBytes = 16384) {
  if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) throw new Error('invalid_input');
  const chunks = []; let bytes = 0;
  for await (const chunk of req) { bytes += chunk.length; if (bytes > maxBytes) throw new Error('invalid_input'); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
const server = createServer((req,res) => withRequestSession(sessionToken(req), () => handleRequest(req,res)));
async function handleRequest(req, res) {
  if (config.hosted && ['GET', 'HEAD'].includes(req.method) && !req.url?.startsWith('/api/') && req.url !== '/health') {
    frontend(req, res, () => { if (!res.headersSent) res.writeHead(404).end(); });
    return;
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200).end(JSON.stringify({ status: 'ok' }));
    return;
  }
  if (req.method === 'GET' && (req.url === '/api/admin/tax-settings/history' || req.url?.startsWith('/api/admin/tax-settings/history?'))) {
    try { const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const history=await listTaxSettingsHistory(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(history)); }
    catch(error){const code=error.message==='invalid_input'?'invalid_input':'unavailable';res.writeHead(code==='invalid_input'?400:503).end(JSON.stringify({error:code}));}return;
  }
  if (['GET','POST'].includes(req.method) && req.url === '/api/admin/tax-settings') {
    try {
      const user = await currentUser(db,sessionToken(req));
      if (!user || user.role !== 'admin' || (req.method === 'POST' && !allowedOrigin(req))) { res.writeHead(403).end(JSON.stringify({error:'forbidden'})); return; }
      const settings = req.method === 'GET' ? await getTaxSettings(db) : await saveTaxSettings(db,user.id,await readJson(req));
      res.writeHead(200).end(JSON.stringify({settings}));
    } catch (error) {
      const code = ['forbidden','invalid_input','version_conflict'].includes(error.message) ? error.message : 'unavailable';
      res.writeHead(code === 'forbidden' ? 403 : code === 'invalid_input' ? 400 : code === 'version_conflict' ? 409 : 503).end(JSON.stringify({error:code}));
    }
    return;
  }
  if(req.method==='GET'&&req.url==='/api/admin/dashboard'){
    try{const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const dashboard=await getDashboard(db);res.writeHead(200).end(JSON.stringify({dashboard}));}catch{res.writeHead(503).end(JSON.stringify({error:'unavailable'}));}return;
  }
  if(req.method==='GET'&&req.url==='/api/admin/schema'){
    try{const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const result=await db.query("SELECT c.table_name,c.column_name,c.data_type,c.is_nullable,c.ordinal_position FROM information_schema.columns c JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name WHERE c.table_schema='public' AND t.table_type='BASE TABLE' ORDER BY c.table_name,c.ordinal_position");
      res.writeHead(200).end(JSON.stringify({columns:result.rows}));
    }catch{res.writeHead(503).end(JSON.stringify({error:'unavailable'}));}return;
  }
  if(req.method==='GET'&&req.url==='/api/lease-options'){try{res.writeHead(200).end(JSON.stringify(await getPublicLeaseOptions(db)));}catch{res.writeHead(503).end(JSON.stringify({error:'unavailable'}));}return;}
  if(req.method==='POST'&&req.url==='/api/lease-selection/preview'){try{if(!allowedOrigin(req)){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const data=await previewLeaseSelection(db,await readJson(req));res.writeHead(200).end(JSON.stringify(data));}catch(e){const code=['invalid_quote','invalid_price','invalid_quantity','price_changed','product_unavailable'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='invalid_quote'?400:code==='unavailable'?503:409).end(JSON.stringify({error:code}));}return;}
  if (req.method === 'GET' && req.url === '/api/catalog') {
    try { res.writeHead(200).end(JSON.stringify({ products: await getCatalog(db) })); }
    catch { res.writeHead(503).end(JSON.stringify({ error: 'catalog_unavailable' })); }
    return;
  }
  const mediaMatch=req.url?.match(/^\/api\/media\/([0-9a-f-]{36})$/i);
  if(req.method==='GET'&&mediaMatch){
    try{const user=await currentUser(db,sessionToken(req));const data=await readProductMedia(db,mediaMatch[1],{userId:user?.id,admin:user?.role==='admin',catalog:can(user,'catalog'),content:can(user,'content')});res.setHeader('Content-Type','image/webp');res.setHeader('X-Content-Type-Options','nosniff');res.writeHead(200).end(data);}
    catch(error){res.writeHead(error.message==='not_found'?404:503).end(JSON.stringify({error:error.message==='not_found'?'not_found':'unavailable'}));}return;
  }
  if(req.method==='POST'&&req.url==='/api/admin/products/media'){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'catalog')||!allowedOrigin(req)){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const media=await uploadProductMedia(db,user.id,await readJson(req,5600000),'catalog');res.writeHead(200).end(JSON.stringify(media));}
    catch(error){const code=error.message==='forbidden'?'forbidden':['invalid_image','invalid_input'].includes(error.message)?'invalid_image':'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_image'?400:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='POST'&&req.url==='/api/admin/site/media'){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'content')||!allowedOrigin(req)){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const media=await uploadProductMedia(db,user.id,await readJson(req,5600000),'content');res.writeHead(200).end(JSON.stringify(media));}
    catch(error){const code=error.message==='forbidden'?'forbidden':['invalid_image','invalid_input'].includes(error.message)?'invalid_image':'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_image'?400:503).end(JSON.stringify({error:code}));}return;
  }
  if (req.method === 'POST' && req.url === '/api/contact') {
    if (!allowedOrigin(req)) { res.writeHead(403).end(JSON.stringify({ error: 'forbidden' })); return; }
    const address = req.socket.remoteAddress || 'unknown'; const now = Date.now();
    const recent = (recentRequests.get(address) || []).filter(t => now - t < 60000);
    if (recent.length >= 5) { res.writeHead(429).end(JSON.stringify({ error: 'rate_limit' })); return; }
    recent.push(now); recentRequests.set(address, recent);
    try {
      const input=await readJson(req);const block=await getSection(db,'contact');
      const saved=await saveContactInquiry(db,input,{existingOnly:!block.content.visible});
      let notification=saved.inquiry.notification_status;
      if(saved.created)notification=await sendInitialInquiryNotification(db,mailer,saved.inquiry.id);
      res.writeHead(200).end(JSON.stringify({ received:true,id:saved.inquiry.id,notification }));
    } catch (error) {
      const code = ['invalid_contact','contact_conflict'].includes(error.message) ? error.message : 'contact_unavailable';
      res.writeHead(code === 'invalid_contact' ? 400 : code==='contact_conflict'?409:503).end(JSON.stringify({ error: code }));
    }
    return;
  }
  if(req.method==='GET'&&(req.url==='/api/admin/order-notification-settings/history'||req.url?.startsWith('/api/admin/order-notification-settings/history?'))){
    try{const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=await listOrderNotificationSettingsHistory(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(result));}
    catch(e){res.writeHead(e.message==='invalid_input'?400:503).end(JSON.stringify({error:e.message==='invalid_input'?'invalid_input':'unavailable'}));}return;
  }
  if(['GET','POST'].includes(req.method)&&req.url==='/api/admin/order-notification-settings'){
    try{const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const settings=req.method==='GET'?await getOrderNotificationSettings(db):await saveOrderNotificationSettings(db,user.id,await readJson(req));res.writeHead(200).end(JSON.stringify({settings}));}
    catch(e){const code=['forbidden','invalid_input','version_conflict','product_conflict'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='version_conflict'?409:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='POST'&&req.url==='/api/admin/inquiries/resolve-notification'){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'orders')||!allowedOrigin(req)){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=await resolvePendingInquiryNotification(db,user.id,await readJson(req));res.writeHead(200).end(JSON.stringify(result));}
    catch(e){const code=['forbidden','invalid_input','not_found','not_resolvable'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='not_found'?404:code==='not_resolvable'?409:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='POST'&&req.url==='/api/admin/inquiries/retry-notification'){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'orders')||!allowedOrigin(req)){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const input=await readJson(req);const result=await retryInquiryNotification(db,mailer,user.id,input.id);res.writeHead(200).end(JSON.stringify(result));}
    catch(e){const code=['forbidden','invalid_input','not_found','not_retryable'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='not_found'?404:code==='not_retryable'?409:503).end(JSON.stringify({error:code}));}return;
  }
  if ((req.method==='GET'&&req.url?.startsWith('/api/admin/inquiries/notes?'))||(req.method==='POST'&&req.url==='/api/admin/inquiries/notes')) {
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'orders')||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const result=req.method==='GET'?await listRequestNotes(db,new URL(req.url,'http://localhost').searchParams,true):await createRequestNote(db,user.id,await readJson(req),true);res.writeHead(200).end(JSON.stringify(result));
    }catch(e){const code=['forbidden','invalid_input','not_found','note_conflict'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='not_found'?404:code==='note_conflict'?409:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/inquiries/history?')){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'orders')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=await listInquiryHistory(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(result));}
    catch(e){const code=['invalid_input','not_found'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='invalid_input'?400:code==='not_found'?404:503).end(JSON.stringify({error:code}));}return;
  }
  if ((req.method==='GET'&&(req.url==='/api/admin/inquiries'||req.url?.startsWith('/api/admin/inquiries?')))||(req.method==='POST'&&req.url==='/api/admin/inquiries/status')) {
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'orders')||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const result=req.method==='GET'?await listContactInquiries(db,new URL(req.url,'http://localhost').searchParams):await changeContactStatus(db,user.id,await readJson(req));res.writeHead(200).end(JSON.stringify(result));
    }catch(e){const code=['forbidden','invalid_input','not_found','status_conflict'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='not_found'?404:code==='status_conflict'?409:503).end(JSON.stringify({error:code}));}return;
  }
  if (req.method === 'POST' && req.url === '/api/quote/preview') {
    if (!allowedOrigin(req)) { res.writeHead(403).end(JSON.stringify({ error: 'forbidden' })); return; }
    try {
      const body = await readJson(req);
      const quote = await previewQuote(db, body.lines);
      // Public amounts are final; keep the tax breakdown internal.
      const { items, totalMinor, currency } = quote;
      res.writeHead(200).end(JSON.stringify({ items, totalMinor, currency }));
    } catch (error) {
      const expected = ['invalid_input', 'invalid_quote', 'invalid_price', 'invalid_quantity', 'invalid_mode', 'invalid_rental_days', 'price_unavailable', 'price_changed', 'product_unavailable'];
      const code = expected.includes(error.message) ? error.message : 'unavailable';
      res.writeHead(code === 'price_changed' ? 409 : code === 'unavailable' ? 503 : 400).end(JSON.stringify({ error: code }));
    }
    return;
  }
  if (req.method === 'POST' && ['/api/offer/pdf', '/api/offer/email'].includes(req.url)) {
    if (!allowedOrigin(req)) { res.writeHead(403).end(JSON.stringify({ error: 'forbidden' })); return; }
    const address = req.socket.remoteAddress || 'unknown'; const now = Date.now();
    const recent = (recentRequests.get(address) || []).filter(t => now - t < 60000);
    if (recent.length >= 10) { res.writeHead(429).end(JSON.stringify({ error: 'rate_limit' })); return; }
    recent.push(now); recentRequests.set(address, recent);
    try {
      const body = await readJson(req, 32768);
      const pdf = await createOfferPdf(db, body.lines, body.lang, body.contact, body.leaseSelection);
      if (req.url === '/api/offer/email') {
        await sendOffer(mailer, body.contact.email, pdf, body.lang);
        res.writeHead(200).end(JSON.stringify({ sent: true }));
      } else {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="pc-lease-estimate.pdf"');
        res.writeHead(200).end(pdf);
      }
    } catch (error) {
      const expected = ['invalid_input','invalid_contact','invalid_quote','invalid_price','price_unavailable','price_changed','product_unavailable','invalid_email','mail_unavailable','mail_uncertain'];
      const code = expected.includes(error.message) ? error.message : 'unavailable';
      res.writeHead(code === 'price_changed' ? 409 : ['mail_unavailable','mail_uncertain','unavailable'].includes(code) ? 503 : 400).end(JSON.stringify({ error: code }));
    }
    return;
  }
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/site/history?')){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'content')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const history=await listSiteBlockHistory(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(history));}
    catch(e){res.writeHead(e.message==='invalid_input'?400:503).end(JSON.stringify({error:e.message==='invalid_input'?'invalid_input':'unavailable'}));}return;
  }
  const sectionMatch = req.url?.match(/^\/api\/(admin\/)?site\/(workspace|featured|calculator|story|faq|about|contact|footer|navigation|layout)$/);
  if (sectionMatch && (req.method === 'GET' || (sectionMatch[1] && req.method === 'POST'))) {
    try {
      let user;
      if (sectionMatch[1]) {
        user = await currentUser(db, sessionToken(req));
        if (!can(user,'content') || (req.method === 'POST' && !allowedOrigin(req))) { res.writeHead(403).end(JSON.stringify({ error: 'forbidden' })); return; }
      }
      const block = req.method === 'GET' ? await getSection(db, sectionMatch[2]) : await saveSiteBlockWithHistory(db,sectionMatch[2],user.id,await readJson(req, 131072), {userId:user.id,admin:user.role==='admin',catalog:can(user,'catalog'),content:can(user,'content')});
      if (!sectionMatch[1] && sectionMatch[2] === 'contact') { const { recipientEmail, ...publicContent } = block.content; block.content = publicContent; }
      res.writeHead(200).end(JSON.stringify(block));
    } catch (error) {
      const code = ['forbidden', 'invalid_block', 'invalid_input', 'version_conflict'].includes(error.message) ? error.message : 'unavailable';
      res.writeHead(code === 'forbidden' ? 403 : code === 'version_conflict' ? 409 : code === 'unavailable' ? 503 : 400).end(JSON.stringify({ error: code }));
    }
    return;
  }
  if (req.url === '/api/site/trust' && req.method === 'GET') {
    try { res.writeHead(200).end(JSON.stringify(await getTrust(db))); }
    catch { res.writeHead(503).end(JSON.stringify({ error: 'unavailable' })); }
    return;
  }
  if (req.url === '/api/site/hero' && req.method === 'GET') {
    try { res.writeHead(200).end(JSON.stringify(await getHero(db))); }
    catch { res.writeHead(503).end(JSON.stringify({ error: 'unavailable' })); }
    return;
  }
  if (req.url === '/api/admin/site/hero' && (req.method === 'GET' || req.method === 'POST')) {
    try {
      const user = await currentUser(db, sessionToken(req));
      if (!can(user,'content') || (req.method === 'POST' && !allowedOrigin(req))) { res.writeHead(403).end(JSON.stringify({ error: 'forbidden' })); return; }
      const block = req.method === 'GET' ? await getHero(db) : await saveSiteBlockWithHistory(db,'hero',user.id,await readJson(req), {userId:user.id,admin:user.role==='admin',catalog:can(user,'catalog'),content:can(user,'content')});
      res.writeHead(200).end(JSON.stringify(block));
    } catch (error) {
      const code = ['forbidden', 'invalid_block', 'invalid_input', 'version_conflict'].includes(error.message) ? error.message : 'unavailable';
      res.writeHead(code === 'forbidden' ? 403 : code === 'version_conflict' ? 409 : code === 'unavailable' ? 503 : 400).end(JSON.stringify({ error: code }));
    }
    return;
  }
  if (req.url === '/api/admin/site/trust' && (req.method === 'GET' || req.method === 'POST')) {
    try {
      const user = await currentUser(db, sessionToken(req));
      if (!can(user,'content') || (req.method === 'POST' && !allowedOrigin(req))) { res.writeHead(403).end(JSON.stringify({ error: 'forbidden' })); return; }
      const block = req.method === 'GET' ? await getTrust(db) : await saveSiteBlockWithHistory(db,'trust',user.id,await readJson(req),{});
      res.writeHead(200).end(JSON.stringify(block));
    } catch (error) {
      const code = ['forbidden', 'invalid_block', 'invalid_input', 'version_conflict'].includes(error.message) ? error.message : 'unavailable';
      res.writeHead(code === 'forbidden' ? 403 : code === 'version_conflict' ? 409 : code === 'unavailable' ? 503 : 400).end(JSON.stringify({ error: code }));
    }
    return;
  }
  if (req.method === 'GET' && req.url === '/api/auth/me') {
    try { res.writeHead(200).end(JSON.stringify({ user: await currentUser(db, sessionToken(req)) })); }
    catch { res.writeHead(503).end(JSON.stringify({ error: 'unavailable' })); } return;
  }
  if(req.url==='/api/account/profile'&&['GET','POST'].includes(req.method)){
    try{const user=await currentUser(db,sessionToken(req));if(!user||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      if(req.method==='GET'){const profile=(await db.query('SELECT first_name,last_name,phone,company_name,profile_version FROM users WHERE id=$1',[user.id])).rows[0];res.writeHead(200).end(JSON.stringify({profile}));return;}
      const input=await readJson(req);if(['firstName','lastName','phone'].some(k=>typeof input[k]!=='string'||!input[k].trim()))throw Error('invalid_input');const saved=await saveOwnUserProfile(db,user.id,{version:input.version,firstName:input.firstName,lastName:input.lastName,phone:input.phone,companyName:input.companyName});const session=await currentUser(db,sessionToken(req));res.writeHead(200).end(JSON.stringify({profile:{first_name:saved.first_name,last_name:saved.last_name,phone:saved.phone,company_name:saved.company_name,profile_version:saved.profile_version},user:session}));
    }catch(error){const code=['forbidden','invalid_input','version_conflict','user_not_found'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='version_conflict'?409:code==='invalid_input'?400:code==='user_not_found'?404:503).end(JSON.stringify({error:code}));}return;
  }
  const customerPdf=req.url?.match(/^\/api\/account\/orders\/([0-9a-f-]{36})\/pdf\?lang=(he|en)$/i);
  if(req.method==='GET'&&customerPdf){try{const user=await currentUser(db,sessionToken(req));if(!user){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const record=await getCustomerOrderPdfRecord(db,user.id,customerPdf[1]);const pdf=await renderQuotePdf(record,customerPdf[2].toLowerCase());res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="pc-lease-${record.id}.pdf"`);res.writeHead(200).end(pdf);}catch(error){res.writeHead(error.message==='not_found'?404:503).end(JSON.stringify({error:error.message==='not_found'?'not_found':'unavailable'}));}return;}
  if(req.method==='GET'&&(req.url==='/api/account/orders'||req.url?.startsWith('/api/account/orders?'))){try{const user=await currentUser(db,sessionToken(req));if(!user){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=await listCustomerOrders(db,user.id,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(result));}catch(error){res.writeHead(error.message==='invalid_input'?400:503).end(JSON.stringify({error:error.message==='invalid_input'?'invalid_input':'unavailable'}));}return;}
  if(req.method==='POST'&&req.url==='/api/admin/contract-documents/kind'){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'contracts')||!allowedOrigin(req)){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=await changeDocumentKind(db,user.id,await readJson(req));res.writeHead(200).end(JSON.stringify(result));}
    catch(e){const code=['forbidden','invalid_input','not_found','version_conflict'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='not_found'?404:code==='version_conflict'?409:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/contract-documents/history?')){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'contracts')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const p=new URL(req.url,'http://localhost').searchParams;const result=await listDocumentKindHistory(db,p.get('documentId'),p.get('before'));res.writeHead(200).end(JSON.stringify(result));}
    catch(error){const code=['not_found','invalid_input'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='not_found'?404:code==='invalid_input'?400:503).end(JSON.stringify({error:code}));}return;
  }
  if((req.method==='GET'&&req.url?.startsWith('/api/admin/contract-documents?'))||(req.method==='POST'&&req.url==='/api/admin/contract-documents')){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'contracts')||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      if(req.method==='GET'){const p=new URL(req.url,'http://localhost').searchParams;const result=await listContractDocuments(db,p.get('contractId'),Number(p.get('version')),p.get('offset')||'0',p.get('before')||'',p.get('historyLimit')==='25');res.writeHead(200).end(JSON.stringify(result));}
      else{const document=await addContractDocument(db,user.id,await readJson(req,7000000));res.writeHead(200).end(JSON.stringify({document}));}
    }catch(error){const code=['forbidden','invalid_input','invalid_pdf','version_not_found','not_found','create_conflict','duplicate_document','document_integrity_failed'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='forbidden'?403:['invalid_input','invalid_pdf'].includes(code)?400:['version_not_found','not_found'].includes(code)?404:['create_conflict','duplicate_document'].includes(code)?409:503).end(JSON.stringify({error:code}));}return;
  }
  const contractDocumentStatusMatch=req.url?.match(/^\/api\/admin\/contract-documents\/([0-9a-f-]{36})\/status\?/i);
  if(req.method==='GET'&&contractDocumentStatusMatch){try{const user=await currentUser(db,sessionToken(req));if(!can(user,'contracts')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const p=new URL(req.url,'http://localhost').searchParams;const document=await contractDocumentStatus(db,contractDocumentStatusMatch[1],p.get('contractId'),Number(p.get('version')));res.writeHead(200).end(JSON.stringify({document}));}catch(error){const code=['not_found','version_not_found','invalid_input','document_integrity_failed'].includes(error.message)?error.message:'unavailable';res.writeHead(['not_found','version_not_found'].includes(code)?404:code==='invalid_input'?400:503).end(JSON.stringify({error:code}));}return;}
  const contractDocument=req.url?.match(/^\/api\/admin\/contract-documents\/([0-9a-f-]{36})$/i);
  if(req.method==='GET'&&contractDocument){try{const user=await currentUser(db,sessionToken(req));if(!can(user,'contracts')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const bytes=await readContractDocument(db,contractDocument[1]);res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition','attachment; filename="contract-document.pdf"');res.setHeader('X-Content-Type-Options','nosniff');res.writeHead(200).end(bytes);}catch(error){const code=['not_found','invalid_input','document_integrity_failed'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='not_found'?404:code==='invalid_input'?400:503).end(JSON.stringify({error:code}));}return;}
  const contractPdf=req.url?.match(/^\/api\/admin\/contracts\/([0-9a-f-]{36})\/versions\/(\d{1,9})\/pdf\?lang=(he|en)$/i);
  if(req.method==='GET'&&contractPdf){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'contracts')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const record=await getContractVersion(db,contractPdf[1],Number(contractPdf[2]));const pdf=await renderContractDraft(record,contractPdf[3].toLowerCase());res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="pc-lease-draft-${record.id}-v${record.version}.pdf"`);res.writeHead(200).end(pdf);
    }catch(error){res.writeHead(error.message==='not_found'?404:error.message==='invalid_input'?400:503).end(JSON.stringify({error:error.message==='not_found'?'not_found':'unavailable'}));}return;
  }
  if(req.method==='POST'&&req.url==='/api/admin/finance/correct-date'){try{const user=await currentUser(db,sessionToken(req));if(!can(user,'finance')||!allowedOrigin(req)){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const correction=await correctFinancialDate(db,user.id,await readJson(req));res.writeHead(200).end(JSON.stringify({correction}));}catch(error){const code=['forbidden','invalid_input','not_found','already_reversed','operation_conflict','commission_review_required','refund_exceeds_payment'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='not_found'?404:['already_reversed','operation_conflict','commission_review_required','refund_exceeds_payment'].includes(code)?409:503).end(JSON.stringify({error:code}));}return;}
  if(req.method==='POST'&&req.url==='/api/admin/finance/correct-amount'){try{const user=await currentUser(db,sessionToken(req));if(!can(user,'finance')||!allowedOrigin(req)){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const correction=await correctFinancialAmount(db,user.id,await readJson(req));res.writeHead(200).end(JSON.stringify({correction}));}catch(error){const code=['forbidden','invalid_input','not_found','already_reversed','operation_conflict','commission_review_required','refund_exceeds_payment'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='not_found'?404:['already_reversed','operation_conflict','commission_review_required','refund_exceeds_payment'].includes(code)?409:503).end(JSON.stringify({error:code}));}return;}
  if(req.method==='GET'&&(req.url==='/api/admin/finance/summary'||req.url?.startsWith('/api/admin/finance/summary?'))){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'finance')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const summary=await getFinancialSummary(db,new URL(req.url,'http://localhost').searchParams.get('requestId'));res.writeHead(200).end(JSON.stringify({summary}));
    }catch(error){const code=['invalid_input','not_found'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='invalid_input'?400:code==='not_found'?404:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='GET'&&(req.url==='/api/admin/finance/orders'||req.url?.startsWith('/api/admin/finance/orders?'))){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'finance')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const result=await searchFinanceOrders(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(result));
    }catch(error){res.writeHead(error.message==='invalid_input'?400:503).end(JSON.stringify({error:error.message==='invalid_input'?'invalid_input':'unavailable'}));}return;
  }
  if ((req.method==='GET'&&(req.url==='/api/admin/finance'||req.url?.startsWith('/api/admin/finance?')))||(req.method==='POST'&&req.url==='/api/admin/finance')) {
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'finance')||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const result=req.method==='GET'?await listFinancialEntries(db,new URL(req.url,'http://localhost').searchParams):{entry:await createFinancialEntry(db,user.id,await readJson(req))};res.writeHead(200).end(JSON.stringify(result));
    }catch(error){const code=['forbidden','invalid_input','request_not_found','not_found','already_reversed','duplicate_entry'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='forbidden'?403:['already_reversed','duplicate_entry'].includes(code)?409:['request_not_found','not_found'].includes(code)?404:code==='invalid_input'?400:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/contracts/history?')){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'contracts')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const history=await listContractHistory(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(history));}
    catch(error){const code=['invalid_input','not_found'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='invalid_input'?400:code==='not_found'?404:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='GET'&&(req.url==='/api/admin/contracts/orders'||req.url?.startsWith('/api/admin/contracts/orders?'))){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'contracts')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const result=await searchFinanceOrders(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(result));
    }catch(error){res.writeHead(error.message==='invalid_input'?400:503).end(JSON.stringify({error:error.message==='invalid_input'?'invalid_input':'unavailable'}));}return;
  }
  if(req.method==='POST'&&req.url==='/api/admin/contracts/review'){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'contracts')||!allowedOrigin(req)){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const review=await reviewContractDraft(db,user.id,await readJson(req));res.writeHead(200).end(JSON.stringify({review}));}
    catch(e){const code=['forbidden','invalid_input','not_found','version_conflict'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='not_found'?404:code==='version_conflict'?409:503).end(JSON.stringify({error:code}));}return;
  }
  if ((req.method==='GET'&&(req.url==='/api/admin/contracts'||req.url?.startsWith('/api/admin/contracts?')))||(req.method==='POST'&&req.url==='/api/admin/contracts')) {
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'contracts')||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const result=req.method==='GET'?await listContracts(db,new URL(req.url,'http://localhost').searchParams):{draft:await saveContractDraft(db,user.id,await readJson(req,65536))};res.writeHead(200).end(JSON.stringify(result));
    }catch(error){const code=['forbidden','invalid_input','invalid_order_snapshot','request_not_found','not_found','version_conflict','request_mismatch','create_conflict','operation_conflict'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='forbidden'?403:['version_conflict','request_mismatch','create_conflict','operation_conflict'].includes(code)?409:['request_not_found','not_found'].includes(code)?404:['invalid_input','invalid_order_snapshot'].includes(code)?400:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/service/replacements/history?')){try{const user=await currentUser(db,sessionToken(req));if(!can(user,'service')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=await listReplacementHistory(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(result));}catch(error){const code=['invalid_input','not_found'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='invalid_input'?400:code==='not_found'?404:503).end(JSON.stringify({error:code}));}return;}
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/service/history?')){try{const user=await currentUser(db,sessionToken(req));if(!can(user,'service')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=await listServiceHistory(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(result));}catch(error){const code=['invalid_input','not_found'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='invalid_input'?400:code==='not_found'?404:503).end(JSON.stringify({error:code}));}return;}
  if (req.method==='POST'&&req.url==='/api/admin/service/replacement') {
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'service')||!can(user,'inventory')||!allowedOrigin(req)){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const replacement=await changeServiceReplacement(db,user.id,await readJson(req));res.writeHead(200).end(JSON.stringify({replacement}));
    }catch(error){const codes=['forbidden','invalid_input','ticket_not_found','ticket_closed','order_not_active','replacement_active','asset_not_found','asset_unavailable','replacement_not_found','operation_conflict'];const code=codes.includes(error.message)?error.message:'unavailable';res.writeHead(code==='forbidden'?403:['ticket_not_found','asset_not_found','replacement_not_found'].includes(code)?404:['ticket_closed','order_not_active','replacement_active','asset_unavailable','operation_conflict'].includes(code)?409:code==='invalid_input'?400:503).end(JSON.stringify({error:code}));}return;
  }
  if ((req.method==='GET'&&(req.url==='/api/admin/service'||req.url?.startsWith('/api/admin/service?')))||(req.method==='POST'&&req.url==='/api/admin/service')) {
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'service')||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const result=req.method==='GET'?await listServiceTickets(db,new URL(req.url,'http://localhost').searchParams):{ticket:await saveServiceTicket(db,user.id,await readJson(req))};res.writeHead(200).end(JSON.stringify(result));
    }catch(error){const code=['forbidden','invalid_input','asset_not_found','not_found','version_conflict','asset_mismatch','replacement_active','create_conflict','operation_conflict'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='forbidden'?403:['version_conflict','asset_mismatch','replacement_active','create_conflict','operation_conflict'].includes(code)?409:code==='asset_not_found'||code==='not_found'?404:code==='invalid_input'?400:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/inventory/purchase/history?')){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'inventory_cost')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const params=new URL(req.url,'http://localhost').searchParams;const result=await listPurchaseHistory(db,params.get('assetId'),params.get('before'));res.writeHead(200).end(JSON.stringify(result));}
    catch(error){const code=['invalid_input','not_found'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='invalid_input'?400:code==='not_found'?404:503).end(JSON.stringify({error:code}));}return;
  }
  if ((req.method==='GET'&&req.url?.startsWith('/api/admin/inventory/purchase?'))||(req.method==='POST'&&req.url==='/api/admin/inventory/purchase')) {
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'inventory_cost')||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const params=new URL(req.url,'http://localhost').searchParams;const result=req.method==='GET'?await findPurchaseAsset(db,params.get('serial'),params.get('historyLimit')==='25'):{details:await savePurchaseDetails(db,user.id,await readJson(req))};res.writeHead(200).end(JSON.stringify(result));
    }catch(error){const code=['forbidden','invalid_input','not_found','version_conflict'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='version_conflict'?409:code==='not_found'?404:code==='invalid_input'?400:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/inventory/reservations/history?')){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'inventory')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const history=await getReservationHistoryPage(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(history));}
    catch(error){const code=['invalid_input','request_not_found','not_found'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='invalid_input'?400:['request_not_found','not_found'].includes(code)?404:503).end(JSON.stringify({error:code}));}return;
  }
  if ((req.method==='GET' && req.url?.startsWith('/api/admin/inventory/reservations?')) || (req.method==='POST' && req.url==='/api/admin/inventory/reservations')) {
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'inventory')||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const result=req.method==='GET'?await getReservations(db,new URL(req.url,'http://localhost').searchParams.get('requestId')):await changeReservation(db,user.id,await readJson(req));res.writeHead(200).end(JSON.stringify(result));
    }catch(error){const expected=['forbidden','invalid_input','request_not_found','request_closed','invalid_line','asset_not_found','asset_unavailable','model_mismatch','quantity_filled','reservation_not_found','operation_conflict','invalid_order_snapshot'];const code=expected.includes(error.message)?error.message:'unavailable';res.writeHead(code==='forbidden'?403:['request_not_found','asset_not_found','reservation_not_found'].includes(code)?404:['request_closed','asset_unavailable','model_mismatch','quantity_filled','operation_conflict','invalid_order_snapshot'].includes(code)?409:code==='unavailable'?503:400).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/inventory/history?')){try{const user=await currentUser(db,sessionToken(req));if(!can(user,'inventory')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=await listInventoryHistory(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(result));}catch(error){const code=['invalid_input','not_found'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='invalid_input'?400:code==='not_found'?404:503).end(JSON.stringify({error:code}));}return;}
  if ((req.method === 'GET' && (req.url === '/api/admin/inventory' || req.url?.startsWith('/api/admin/inventory?') || req.url === '/api/admin/inventory/products')) || (req.method === 'POST' && req.url === '/api/admin/inventory')) {
    try {
      const user=await currentUser(db,sessionToken(req));
      if(!can(user,'inventory')||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const result=req.method==='POST'?{asset:await saveInventoryAsset(db,user.id,await readJson(req))}:req.url==='/api/admin/inventory/products'?{products:await inventoryProducts(db)}:await listInventory(db,new URL(req.url,'http://localhost').searchParams);
      res.writeHead(200).end(JSON.stringify(result));
    }catch(error){const code=['forbidden','invalid_input','product_not_found','not_found','version_conflict','duplicate_serial','asset_reserved','create_conflict'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='forbidden'?403:['version_conflict','duplicate_serial','asset_reserved','create_conflict'].includes(code)?409:code==='product_not_found'||code==='not_found'?404:code==='invalid_input'?400:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.url==='/api/admin/lease-settings'&&['GET','POST'].includes(req.method)){try{const user=await currentUser(db,sessionToken(req));if(!can(user,'catalog')||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=req.method==='GET'?await listLeaseSettings(db):await saveLeaseSettings(db,user.id,await readJson(req));res.writeHead(200).end(JSON.stringify(result));}catch(e){const code=['forbidden','invalid_input','version_conflict','product_conflict'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:['version_conflict','product_conflict'].includes(code)?409:503).end(JSON.stringify({error:code}));}return;}
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/products/history?')){try{const user=await currentUser(db,sessionToken(req));if(!can(user,'catalog')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const data=await listProductHistory(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(data));}catch(error){const code=['invalid_input','not_found'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='invalid_input'?400:code==='not_found'?404:503).end(JSON.stringify({error:code}));}return;}
  if ((req.url === '/api/admin/products' && (req.method === 'GET' || req.method === 'POST')) || (req.url === '/api/admin/products/create' && req.method === 'POST')) {
    try {
      const user = await currentUser(db, sessionToken(req));
      if (!can(user,'catalog') || (req.method === 'POST' && !allowedOrigin(req))) { res.writeHead(403).end(JSON.stringify({ error: 'forbidden' })); return; }
      if (req.method === 'GET') { res.writeHead(200).end(JSON.stringify({ products: await listAdminProducts(db) })); return; }
      const body=await readJson(req);const access={userId:user.id,admin:user.role==='admin',catalog:can(user,'catalog'),content:can(user,'content')};const product = req.url.endsWith('/create') ? await createAdminProduct(db,body,user.id,access) : await saveAdminProduct(db,body,user.id,access);
      res.writeHead(200).end(JSON.stringify({ product }));
    } catch (error) {
      const code = ['forbidden','invalid_product','invalid_input','version_conflict','duplicate_slug'].includes(error.message) ? error.message : 'unavailable';
      res.writeHead(code === 'forbidden' ? 403 : ['version_conflict','duplicate_slug'].includes(code) ? 409 : code === 'unavailable' ? 503 : 400).end(JSON.stringify({ error: code }));
    } return;
  }
  if(req.method==='GET'&&(req.url==='/api/admin/requests/companies'||req.url?.startsWith('/api/admin/requests/companies?'))){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'orders')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=await searchOrderCompanies(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(result));}
    catch(error){res.writeHead(error.message==='invalid_input'?400:503).end(JSON.stringify({error:error.message==='invalid_input'?'invalid_input':'unavailable'}));}return;
  }
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/requests/notification-history?')){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'orders')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const history=await listRequestNotificationHistory(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(history));}
    catch(error){const code=['invalid_input','not_found'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='invalid_input'?400:code==='not_found'?404:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/requests/link-history?')){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'orders')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const history=await listRequestLinkHistory(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(history));}
    catch(error){const code=['invalid_input','not_found'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='invalid_input'?400:code==='not_found'?404:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/requests/status-history?')){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'orders')){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const history=await listRequestStatusHistory(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(history));}
    catch(error){const code=['invalid_input','not_found'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='invalid_input'?400:code==='not_found'?404:503).end(JSON.stringify({error:code}));}return;
  }
  if (req.method === 'GET' && (req.url === '/api/admin/requests' || req.url?.startsWith('/api/admin/requests?'))) {
    try {
      const user = await currentUser(db, sessionToken(req));
      if (!can(user,'orders')) { res.writeHead(403).end(JSON.stringify({ error: 'forbidden' })); return; }
      const result = await listRequests(db, new URL(req.url, 'http://localhost').searchParams, {includeInventory:can(user,'inventory')});
      res.writeHead(200).end(JSON.stringify(result));
    } catch (error) { const code=['invalid_input','forbidden'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='invalid_input'?400:code==='forbidden'?403:503).end(JSON.stringify({error:code})); } return;
  }
  if ((req.method === 'GET' && req.url?.startsWith('/api/admin/requests/notes?')) || (req.method === 'POST' && req.url === '/api/admin/requests/notes')) {
    try {
      const user = await currentUser(db, sessionToken(req));
      if (!can(user, 'orders') || (req.method === 'POST' && !allowedOrigin(req))) { res.writeHead(403).end(JSON.stringify({error:'forbidden'})); return; }
      const result = req.method === 'GET' ? await listRequestNotes(db, new URL(req.url, 'http://localhost').searchParams) : await createRequestNote(db, user.id, await readJson(req));
      res.writeHead(200).end(JSON.stringify(result));
    } catch (error) {
      const code = ['forbidden','invalid_input','not_found','note_conflict'].includes(error.message) ? error.message : 'unavailable';
      res.writeHead(code === 'forbidden' ? 403 : code === 'invalid_input' ? 400 : code === 'not_found' ? 404 : code === 'note_conflict' ? 409 : 503).end(JSON.stringify({error:code}));
    } return;
  }
  if(req.method==='POST'&&req.url==='/api/admin/requests/resolve-notification'){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'orders')||!allowedOrigin(req)){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=await resolvePendingRequestNotification(db,user.id,await readJson(req));res.writeHead(200).end(JSON.stringify(result));}
    catch(e){const code=['forbidden','invalid_input','not_found','not_resolvable'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='not_found'?404:code==='not_resolvable'?409:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='POST'&&req.url==='/api/admin/requests/retry-notification'){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'orders')||!allowedOrigin(req)){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const input=await readJson(req);const result=await retryRequestNotification(db,mailer,user.id,input.id,config.hosted?config.origins[0]:null);res.writeHead(200).end(JSON.stringify(result));}
    catch(e){const code=['forbidden','invalid_input','not_found','not_retryable'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='not_found'?404:code==='not_retryable'?409:503).end(JSON.stringify({error:code}));}return;
  }
  if (req.method === 'POST' && req.url === '/api/admin/requests/status') {
    try {
      const user = await currentUser(db, sessionToken(req));
      if (!can(user,'orders') || !allowedOrigin(req)) { res.writeHead(403).end(JSON.stringify({ error: 'forbidden' })); return; }
      const request = await changeRequestStatus(db, user.id, await readJson(req));
      res.writeHead(200).end(JSON.stringify({ request }));
    } catch (error) {
      const code = ['forbidden', 'invalid_input', 'not_found', 'status_conflict'].includes(error.message) ? error.message : 'unavailable';
      res.writeHead(code === 'forbidden' ? 403 : code === 'status_conflict' ? 409 : code === 'not_found' ? 404 : code === 'forbidden' ? 403 : code === 'invalid_input' ? 400 : 503).end(JSON.stringify({ error: code }));
    }
    return;
  }
  if((req.method==='GET'&&req.url?.startsWith('/api/admin/requests/customers?'))||(req.method==='POST'&&req.url==='/api/admin/requests/customer')){
    try{const user=await currentUser(db,sessionToken(req));if(!can(user,'orders')||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const result=req.method==='GET'?await searchRequestCustomers(db,new URL(req.url,'http://localhost').searchParams):await linkRequestCustomer(db,user.id,await readJson(req));res.writeHead(200).end(JSON.stringify(result));
    }catch(error){const code=['forbidden','invalid_input','not_found','user_not_found','version_conflict'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='version_conflict'?409:['not_found','user_not_found'].includes(code)?404:code==='forbidden'?403:code==='invalid_input'?400:503).end(JSON.stringify({error:code}));}return;
  }
  if (req.method === 'POST' && req.url === '/api/admin/requests/organization') {
    try {
      const user=await currentUser(db,sessionToken(req));
      if(!can(user,'orders')||!allowedOrigin(req)){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const request=await linkRequestOrganization(db,user.id,await readJson(req));
      res.writeHead(200).end(JSON.stringify({request}));
    } catch(error){const code=['forbidden','invalid_input','not_found','organization_not_found','version_conflict'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='version_conflict'?409:code==='not_found'||code==='organization_not_found'?404:code==='forbidden'?403:code==='invalid_input'?400:503).end(JSON.stringify({error:code}));} return;
  }
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/organizations/history?')){
    try{const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const history=await listOrganizationHistory(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(history));}
    catch(error){const code=['invalid_input','not_found'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='invalid_input'?400:code==='not_found'?404:503).end(JSON.stringify({error:code}));}return;
  }
  if (['GET','POST'].includes(req.method) && (req.url === '/api/admin/organizations' || (req.method === 'GET' && req.url?.startsWith('/api/admin/organizations?')))) {
    try {
      const user=await currentUser(db,sessionToken(req));
      if(!user||user.role!=='admin'||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const result=req.method==='GET'?await listOrganizations(db,new URL(req.url,'http://localhost').searchParams):{organization:await saveOrganization(db,await readJson(req),user.id)};
      res.writeHead(200).end(JSON.stringify(result));
    } catch(error) {const code=['forbidden','invalid_input','version_conflict','create_conflict','not_found'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='forbidden'?403:['version_conflict','create_conflict'].includes(code)?409:code==='not_found'?404:code==='invalid_input'?400:503).end(JSON.stringify({error:code}));} return;
  }
  if ((req.method==='GET'&&req.url?.startsWith('/api/admin/requests/dealer?'))||(req.method==='POST'&&req.url==='/api/admin/requests/dealer')){
    try{const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=req.method==='GET'?await getRequestDealer(db,new URL(req.url,'http://localhost').searchParams.get('id'),new URL(req.url,'http://localhost').searchParams.get('offset')||'0'):await linkRequestDealer(db,user.id,await readJson(req));res.writeHead(200).end(JSON.stringify(result));}
    catch(e){const code=['forbidden','invalid_input','not_found','dealer_not_found','dealer_inactive','version_conflict'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:['not_found','dealer_not_found'].includes(code)?404:['dealer_inactive','version_conflict'].includes(code)?409:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/dealers/orders?')){
    try{const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=await listDealerOrders(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(result));}
    catch(e){const code=['invalid_input','not_found'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='not_found'?404:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/dealers/history?')){
    try{const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=await listDealerHistory(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(result));}
    catch(e){const code=['invalid_input','not_found'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='not_found'?404:503).end(JSON.stringify({error:code}));}return;
  }
  if (['GET','POST'].includes(req.method) && (req.url==='/api/admin/dealers'||(req.method==='GET'&&req.url?.startsWith('/api/admin/dealers?')))) {
    try {const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const result=req.method==='GET'?await listDealers(db,new URL(req.url,'http://localhost').searchParams):{dealer:await saveDealer(db,user.id,await readJson(req))};res.writeHead(200).end(JSON.stringify(result));
    }catch(e){const code=['forbidden','invalid_input','version_conflict','create_conflict','not_found'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='unavailable'?503:code==='not_found'?404:code==='invalid_input'?400:409).end(JSON.stringify({error:code}));}return;
  }
  if (['GET','POST'].includes(req.method) && ['/api/admin/access-roles','/api/admin/access-roles/assign','/api/admin/access-roles/delete','/api/admin/access-roles/history'].includes(new URL(req.url,'http://localhost').pathname)) {
    try {
      const user=await currentUser(db,sessionToken(req));
      if(!user||user.role!=='admin'||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}
      const url=new URL(req.url,'http://localhost'), path=url.pathname;
      if ((req.method==='GET' && !['/api/admin/access-roles','/api/admin/access-roles/history'].includes(path)) || (req.method==='POST' && path==='/api/admin/access-roles/history')) {res.writeHead(405).end();return;}
      const result=req.method==='GET'?(path.endsWith('/history')?await listAccessRoleHistory(db,url.searchParams):await listAccessRoles(db)):path.endsWith('/assign')?await assignAccessRoles(db,user.id,await readJson(req)):path.endsWith('/delete')?await deleteAccessRole(db,user.id,await readJson(req)):{role:await saveAccessRole(db,user.id,await readJson(req))};
      res.writeHead(200).end(JSON.stringify(result));
    }catch(e){const code=['forbidden','invalid_input','not_found','version_conflict','name_conflict','admin_has_full_access','dealer_only_account'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='not_found'?404:code==='invalid_input'||code==='admin_has_full_access'?400:code==='unavailable'?503:409).end(JSON.stringify({error:code}));}return;
  }
  if(((req.method==='GET'&&(req.url?.startsWith('/api/admin/dealers/commission-work?')||req.url?.startsWith('/api/admin/dealers/commission-balance?')))||(req.method==='POST'&&['/api/admin/dealers/commission-reconcile','/api/admin/dealers/commission-refund'].includes(req.url)))){
    try{const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}let result;if(req.method==='GET'){const p=new URL(req.url,'http://localhost');result=p.pathname.endsWith('commission-work')?await commissionWork(db,p.searchParams.get('dealerId'),p.searchParams.get('offset')||'0'):await commissionBalance(db,p.searchParams.get('dealerId'));}else{const input=await readJson(req);result=req.url.endsWith('commission-refund')?await attachCommissionRefund(db,user.id,input):await reconcileCommissionPayment(db,user.id,input);}res.writeHead(200).end(JSON.stringify(result));}
    catch(e){const code=['forbidden','invalid_input','not_found','invalid_payment','payment_not_found','order_mismatch','already_reversed','refund_exceeds_payment','invalid_refund_date','commission_review_required','link_conflict','operation_conflict','dealer_conflict'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:['not_found','payment_not_found'].includes(code)?404:code==='unavailable'?503:409).end(JSON.stringify({error:code}));}return;
  }
  if ((req.method==='GET'&&req.url?.startsWith('/api/admin/dealers/commission-manual?'))||(req.method==='POST'&&req.url==='/api/admin/dealers/commission-manual')) {
    try{const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=req.method==='GET'?{entries:await listCommissionManualEntries(db,new URL(req.url,'http://localhost').searchParams.get('dealerId'))}:await saveCommissionManualEntry(db,user.id,await readJson(req));res.writeHead(200).end(JSON.stringify(result));}
    catch(e){const code=['forbidden','invalid_input','not_found','operation_conflict'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='not_found'?404:code==='operation_conflict'?409:503).end(JSON.stringify({error:code}));}return;
  }
  if ((req.method==='GET'&&req.url?.startsWith('/api/admin/dealers/commission-terms?'))||(req.method==='POST'&&req.url==='/api/admin/dealers/commission-terms')) {
    try{const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=req.method==='GET'?await getCommissionTerms(db,new URL(req.url,'http://localhost').searchParams.get('requestId')):await saveCommissionTerms(db,user.id,await readJson(req));res.writeHead(200).end(JSON.stringify(result));}
    catch(e){const code=['forbidden','invalid_input','not_found','dealer_conflict','dealer_inactive','version_conflict'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='not_found'?404:code==='unavailable'?503:409).end(JSON.stringify({error:code}));}return;
  }
  if ((req.method==='GET'&&req.url?.startsWith('/api/admin/dealers/commission-rates?'))||(req.method==='POST'&&req.url==='/api/admin/dealers/commission-rates')) {
    try{const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=req.method==='GET'?{rates:await listCommissionRates(db,new URL(req.url,'http://localhost').searchParams.get('dealerId'))}:{rate:await saveCommissionRate(db,user.id,await readJson(req))};res.writeHead(200).end(JSON.stringify(result));}
    catch(e){const code=['forbidden','invalid_input','not_found','past_date','date_conflict','operation_conflict'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='not_found'?404:code==='unavailable'?503:409).end(JSON.stringify({error:code}));}return;
  }
  if ((req.method==='GET' && req.url?.startsWith('/api/admin/dealer-client?')) || (req.method==='POST' && req.url==='/api/admin/dealer-client')) {
    try {const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const data=req.method==='GET'?await getDealerClientLink(db,new URL(req.url,'http://localhost').searchParams):await saveDealerClientLink(db,user.id,await readJson(req));res.writeHead(200).end(JSON.stringify(data));}
    catch(e){const code=['forbidden','invalid_input','not_found','version_conflict','dealer_inactive','not_customer'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='not_found'?404:code==='unavailable'?503:409).end(JSON.stringify({error:code}));}return;
  }
  if ((req.method==='GET' && req.url?.startsWith('/api/admin/dealer-access?')) || (req.method==='POST' && req.url==='/api/admin/dealer-access')) {
    try {const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'||(req.method==='POST'&&!allowedOrigin(req))){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=req.method==='GET'?await getDealerAccess(db,new URL(req.url,'http://localhost').searchParams.get('userId')):await setDealerAccess(db,user.id,await readJson(req));res.writeHead(200).end(JSON.stringify(result));}
    catch(e){const code=['forbidden','invalid_input','not_found','version_conflict','dealer_inactive','dealer_has_staff_access'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:code==='not_found'?404:code==='unavailable'?503:409).end(JSON.stringify({error:code}));}return;
  }
  if (req.method==='GET' && (['/api/dealer/orders','/api/dealer/clients'].includes(new URL(req.url,'http://localhost').pathname))) {
    try {const user=await currentUser(db,sessionToken(req));if(!user){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const data=await listOwnDealerOrders(db,user.id,new URL(req.url,'http://localhost').searchParams,new URL(req.url,'http://localhost').pathname.endsWith('/clients')?'clients':'orders');res.writeHead(200).end(JSON.stringify(data));}
    catch(e){const code=['forbidden','invalid_input'].includes(e.message)?e.message:'unavailable';res.writeHead(code==='forbidden'?403:code==='invalid_input'?400:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/users/access-history?')){
    try{const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const result=await listAccessHistory(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(result));}
    catch(error){const code=['invalid_input','user_not_found'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='invalid_input'?400:code==='user_not_found'?404:503).end(JSON.stringify({error:code}));}return;
  }
  if(req.method==='GET'&&req.url?.startsWith('/api/admin/users/organization-history?')){
    try{const user=await currentUser(db,sessionToken(req));if(!user||user.role!=='admin'){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}const history=await listUserOrganizationHistory(db,new URL(req.url,'http://localhost').searchParams);res.writeHead(200).end(JSON.stringify(history));}
    catch(error){const code=['invalid_input','user_not_found'].includes(error.message)?error.message:'unavailable';res.writeHead(code==='invalid_input'?400:code==='user_not_found'?404:503).end(JSON.stringify({error:code}));}return;
  }
  if ((req.method === 'GET' && (req.url === '/api/admin/users' || req.url?.startsWith('/api/admin/users?'))) || (req.method === 'POST' && ['/api/admin/users/role', '/api/admin/users/profile', '/api/admin/users/organization', '/api/admin/users/permissions','/api/admin/users/active'].includes(req.url))) {
    try {
      const user = await currentUser(db, sessionToken(req));
      if (!user || user.role !== 'admin' || (req.method === 'POST' && !allowedOrigin(req))) { res.writeHead(403).end(JSON.stringify({ error:'forbidden' })); return; }
      if (req.method === 'GET') { const result = await listUsers(db,new URL(req.url,'http://localhost').searchParams); res.writeHead(200).end(JSON.stringify({ ...result, currentUserId:user.id })); return; }
      const input = await readJson(req);
      const updated = req.url === '/api/admin/users/profile' ? await saveUserProfileAsAdmin(db, user.id, input) : req.url === '/api/admin/users/organization' ? await linkUserOrganization(db,user.id,input) : req.url === '/api/admin/users/permissions' ? await saveStaffPermissions(db,user.id,input) : req.url === '/api/admin/users/active' ? await setUserActive(db,user.id,input) : await changeUserRole(db, user.id, input);
      res.writeHead(200).end(JSON.stringify({ user:updated }));
    } catch (error) {
      const code = ['forbidden','invalid_input','cannot_demote_self','cannot_disable_self','last_admin','user_not_found','organization_not_found','version_conflict','admin_has_full_access','dealer_only_account'].includes(error.message) ? error.message : 'unavailable';
      res.writeHead(code === 'forbidden' ? 403 : code === 'unavailable' ? 503 : code === 'user_not_found' || code === 'organization_not_found' ? 404 : ['version_conflict','dealer_only_account'].includes(code) ? 409 : 400).end(JSON.stringify({ error:code }));
    }
    return;
  }
  const adminPdf = req.url?.match(/^\/api\/admin\/requests\/([0-9a-f-]{36})\/pdf(?:\?lang=(he|en))?$/i);
  if (req.method === 'GET' && adminPdf) {
    try {
      const user = await currentUser(db, sessionToken(req));
      if (!can(user,'orders')) { res.writeHead(403).end(JSON.stringify({ error: 'forbidden' })); return; }
      const result = await db.query('SELECT id, order_number, contact_json, product_snapshot_json, tariff_snapshot_json, created_at FROM requests WHERE id=$1', [adminPdf[1]]);
      const row = result.rows[0];
      if (!row?.tariff_snapshot_json?.quote) { res.writeHead(404).end(JSON.stringify({ error: 'not_found' })); return; }
      const pdf = await renderQuotePdf({ id: row.id, orderNumber:row.order_number, contact: row.contact_json, products: row.product_snapshot_json.quoteProducts, quote: row.tariff_snapshot_json.quote },adminPdf[2]?.toLowerCase() || 'he');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="pc-lease-${row.id}.pdf"`);
      res.writeHead(200).end(pdf);
    } catch { res.writeHead(503).end(JSON.stringify({ error: 'unavailable' })); }
    return;
  }
  if (req.method === 'POST' && req.url === '/api/quotes') {
    if (!allowedOrigin(req)) { res.writeHead(403).end(JSON.stringify({ error: 'forbidden' })); return; }
    const address = req.socket.remoteAddress || 'unknown'; const now = Date.now();
    const recent = (recentRequests.get(address) || []).filter(t => now - t < 60000);
    if (recent.length >= 10) { res.writeHead(429).end(JSON.stringify({ error: 'rate_limit' })); return; }
    recent.push(now); recentRequests.set(address, recent);
    try {
      const body = await readJson(req, 32768);
      const saved = await saveMultiQuote(db, body);
      const notification = saved.created ? await sendInitialRequestNotification(db, mailer, saved, 'order', config.hosted?config.origins[0]:null) : saved.notification;
      const pdf = await renderQuotePdf(saved, body.lang === 'en' ? 'en' : 'he');
      res.writeHead(200).end(JSON.stringify({ id: saved.id, orderNumber: saved.orderNumber, notification, pdf: pdf.toString('base64') }));
    } catch (error) {
      const expected = ['invalid_input', 'invalid_request', 'invalid_quote', 'invalid_price', 'product_unavailable', 'request_conflict', 'price_changed', 'price_unavailable'];
      const code = expected.includes(error.message) ? error.message : 'request_unavailable';
      res.writeHead(['request_conflict', 'price_changed'].includes(code) ? 409 : code === 'request_unavailable' ? 503 : 400).end(JSON.stringify({ error: code }));
    }
    return;
  }
  if (req.method === 'POST' && req.url?.startsWith('/api/auth/')) {
    if (!allowedOrigin(req)) { res.writeHead(403).end(JSON.stringify({ error: 'forbidden' })); return; }
    // Ending a session must remain available even when authentication attempts are throttled.
    if (req.url !== '/api/auth/logout') {
      const key = req.socket.remoteAddress || 'unknown'; const now = Date.now();
      const recent = (authRequests.get(key) || []).filter(t => now - t < 60000);
      if (recent.length >= 10) { res.writeHead(429).end(JSON.stringify({ error: 'rate_limit' })); return; }
      recent.push(now); authRequests.set(key, recent);
    }
    try {
      const body = await readJson(req);
      if (req.url === '/api/auth/register') { if(!body||typeof body!=='object')throw Error('invalid_input');await register(db, body.email, body.password,'customer',{firstName:body.firstName,lastName:body.lastName,phone:body.phone,companyName:body.companyName??''}); res.writeHead(201).end(JSON.stringify({ ok: true })); return; }
      if (req.url === '/api/auth/login') {
        const result = await login(db, body.email, body.password);
        res.setHeader('Set-Cookie', 'pclease_session=' + result.token + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200' + config.secureCookie);
        res.writeHead(200).end(JSON.stringify({ user: result.user })); return;
      }
      if (req.url === '/api/auth/logout') { await logout(db, sessionToken(req)); res.setHeader('Set-Cookie', 'pclease_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' + config.secureCookie); res.writeHead(200).end(JSON.stringify({ ok: true })); return; }
      if (req.url === '/api/auth/reset-request') { await beginReset(db, mailer, body.email, req.headers.origin); res.writeHead(200).end(JSON.stringify({ ok: true })); return; }
      if (req.url === '/api/auth/reset') { await finishReset(db, body.token, body.password); res.writeHead(200).end(JSON.stringify({ ok: true })); return; }
      if (req.url === '/api/auth/verification-request') {const user=await currentUser(db,sessionToken(req));if(!user){res.writeHead(403).end(JSON.stringify({error:'forbidden'}));return;}if(!['he','en'].includes(body.lang))throw Error('invalid_input');const result=await sendVerification(db,mailer,user.id,req.headers.origin,body.lang);res.writeHead(200).end(JSON.stringify(result));return;}
      if (req.url === '/api/auth/verify-email') {await confirmVerification(db,body.token);res.writeHead(200).end(JSON.stringify({ok:true}));return;}
      res.writeHead(404).end(JSON.stringify({ error: 'not_found' }));
    } catch (e) {
      const code = ['forbidden','invalid_input', 'invalid_credentials', 'already_exists', 'invalid_reset','invalid_verification'].includes(e.message) ? e.message : 'unavailable';
      res.writeHead(code === 'forbidden' ? 403 : code === 'unavailable' ? 503 : 400).end(JSON.stringify({ error: code }));
    } return;
  }
  if (req.method === 'POST' && req.url === '/api/requests') {
    const origin = req.headers.origin;
    if (!allowedOrigin(req) || !req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
      res.writeHead(403).end(JSON.stringify({ error: 'forbidden' })); return;
    }
    const address = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const recent = (recentRequests.get(address) || []).filter(t => now - t < 60000);
    if (recent.length >= 10) { res.writeHead(429).end(JSON.stringify({ error: 'rate_limit' })); return; }
    recent.push(now); recentRequests.set(address, recent);
    try {
      let body = ''; let bytes = 0;
      for await (const chunk of req) { bytes += chunk.length; if (bytes > 16384) { res.writeHead(413).end(); return; } body += chunk.toString('utf8'); }
      const saved = await saveRequest(db, JSON.parse(body));
      let notification = saved.notification;
      if (saved.created) notification = await sendInitialRequestNotification(db, mailer, saved, 'request');
      res.writeHead(200).end(JSON.stringify({ id: saved.id, notification }));
    } catch (error) {
      const expected = ['invalid_request', 'product_unavailable', 'request_conflict', 'price_changed', 'price_unavailable', 'invalid_price'];
      const code = expected.includes(error.message) ? error.message : 'request_unavailable';
      res.writeHead(['request_conflict', 'price_changed'].includes(code) ? 409 : code === 'request_unavailable' ? 503 : 400).end(JSON.stringify({ error: code }));
    }
    return;
  }
  res.writeHead(404).end(JSON.stringify({ error: 'not_found' }));
}
server.listen(port, config.host, () => console.log(`PC-LEASE server listening on ${config.host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(async () => { mailer?.close(); await db.end(); process.exit(0); }));
}
