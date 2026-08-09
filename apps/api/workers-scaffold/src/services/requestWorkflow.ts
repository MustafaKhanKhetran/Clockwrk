type Row = Record<string, unknown>;

export class WorkflowError extends Error {
  constructor(message: string, public status: 400 | 404 | 409 | 500 = 500) { super(message); }
}

const PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);

export async function addRequestActivity(db: D1Database, requestId: number, eventType: string, label: string, options: { actorType?: string; actorId?: number | null; metadata?: unknown } = {}) {
  await db.prepare(`INSERT INTO request_activity (request_id,actor_type,actor_id,event_type,label,metadata) VALUES (?,?,?,?,?,?)`)
    .bind(requestId, options.actorType || 'system', options.actorId ?? null, eventType, label, options.metadata ? JSON.stringify(options.metadata) : null).run();
}

export async function nextQueuePosition(db: D1Database, clientId: number) {
  const row = await db.prepare(`SELECT COALESCE(MAX(queue_position),0)+1024 AS next_position FROM requests WHERE client_id=? AND status='queue' AND request_kind!='parent'`).bind(clientId).first<{next_position:number}>();
  return Number(row?.next_position || 1024);
}

export async function loadBreakdown(db: D1Database, parentRequestId: number) {
  const { results } = await db.prepare(`SELECT bp.id,bp.parent_request_id,bp.title,bp.description,bp.type,bp.priority,bp.position,bp.depends_on_part_id,bp.child_request_id,dependency.position AS depends_on_position
    FROM request_breakdown_parts bp LEFT JOIN request_breakdown_parts dependency ON dependency.id=bp.depends_on_part_id
    WHERE bp.parent_request_id=? ORDER BY bp.position`).bind(parentRequestId).all();
  return results;
}

type BreakdownPart = { title?:unknown; description?:unknown; type?:unknown; priority?:unknown; depends_on_position?:unknown; dependsOnPosition?:unknown };
const normalizeParts = (parts: BreakdownPart[]) => {
  if (!Array.isArray(parts) || parts.length < 2 || parts.length > 50) throw new WorkflowError('A breakdown must contain between 2 and 50 parts.', 400);
  const normalized = parts.map((part,index) => ({
    title:String(part.title||'').trim(), description:String(part.description||'').trim()||null, type:String(part.type||'').trim()||null,
    priority:PRIORITIES.has(String(part.priority||'').toLowerCase())?String(part.priority).toLowerCase():'normal',
    position:index+1, dependsOnPosition:Number(part.depends_on_position||part.dependsOnPosition||0)||null,
  }));
  if(normalized.some(part=>!part.title))throw new WorkflowError('Every breakdown part needs a title.',400);
  if(normalized.some(part=>part.dependsOnPosition && (part.dependsOnPosition<1||part.dependsOnPosition>=part.position)))throw new WorkflowError('A part can only depend on an earlier part.',400);
  return normalized;
};

export async function saveBreakdownProposal(db:D1Database,{parentRequestId,parts,employeeId,sendToClient=true}:{parentRequestId:number;parts:BreakdownPart[];employeeId:number;sendToClient?:boolean}){
  const normalized=normalizeParts(parts);
  const parent=await db.prepare('SELECT * FROM requests WHERE id=?').bind(parentRequestId).first<Row>();
  if(!parent)throw new WorkflowError('Request not found.',404);
  if(parent.request_kind==='child')throw new WorkflowError('A child request cannot become a request group.',409);
  if(parent.scope_status==='approved')throw new WorkflowError('An approved breakdown cannot be replaced.',409);
  if(parent.status!=='queue')throw new WorkflowError('Only queued requests can be broken down.',409);
  const statements:D1PreparedStatement[]=[db.prepare('DELETE FROM request_breakdown_parts WHERE parent_request_id=?').bind(parentRequestId)];
  for(const part of normalized) statements.push(db.prepare(`INSERT INTO request_breakdown_parts (parent_request_id,title,description,type,priority,position,created_by_employee_id) VALUES (?,?,?,?,?,?,?)`).bind(parentRequestId,part.title,part.description,part.type,part.priority,part.position,employeeId));
  for(const part of normalized)if(part.dependsOnPosition)statements.push(db.prepare(`UPDATE request_breakdown_parts SET depends_on_part_id=(SELECT id FROM request_breakdown_parts WHERE parent_request_id=? AND position=?) WHERE parent_request_id=? AND position=?`).bind(parentRequestId,part.dependsOnPosition,parentRequestId,part.position));
  statements.push(db.prepare(`UPDATE requests SET request_kind='parent',scope_status=?,queue_position=NULL,assigned_to=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(sendToClient?'proposed':'reviewing',parentRequestId));
  statements.push(db.prepare(`INSERT INTO request_activity (request_id,actor_type,actor_id,event_type,label,metadata) VALUES (?,'employee',?,?,?,?)`).bind(parentRequestId,employeeId,sendToClient?'breakdown_proposed':'breakdown_draft_saved',`${sendToClient?'Breakdown proposed':'Breakdown draft saved'} · ${normalized.length} parts`,JSON.stringify({part_count:normalized.length})));
  // D1 batch executes atomically; all part inserts and dependency links commit together.
  await db.batch(statements);
  return {parentId:parentRequestId,parts:await loadBreakdown(db,parentRequestId)};
}

export async function sendBreakdownToClient(db:D1Database,{parentRequestId,employeeId}:{parentRequestId:number;employeeId:number}){
  const parent=await db.prepare('SELECT * FROM requests WHERE id=?').bind(parentRequestId).first<Row>();
  if(!parent)throw new WorkflowError('Request not found.',404);
  if(parent.request_kind!=='parent'||parent.scope_status!=='reviewing')throw new WorkflowError('Save a valid breakdown draft before sending it.',409);
  const count=Number((await db.prepare('SELECT COUNT(*) AS count FROM request_breakdown_parts WHERE parent_request_id=?').bind(parentRequestId).first<{count:number}>())?.count||0);
  if(count<2)throw new WorkflowError('A breakdown needs at least two parts.',409);
  await db.batch([
    db.prepare("UPDATE requests SET scope_status='proposed',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(parentRequestId),
    db.prepare(`INSERT INTO request_activity (request_id,actor_type,actor_id,event_type,label) VALUES (?,'employee',?,'breakdown_proposed',?)`).bind(parentRequestId,employeeId,`Breakdown sent to client · ${count} parts`),
    db.prepare(`INSERT INTO dashboard_alerts (type,title,message,link) VALUES ('system','Breakdown sent to client',?,?)`).bind(`${String(parent.title)} is awaiting client approval.`,`/requests/${parentRequestId}`),
  ]);
  return count;
}

export async function markScopeReview(db:D1Database,{requestId,employeeId}:{requestId:number;employeeId:number}){
  const request=await db.prepare('SELECT * FROM requests WHERE id=?').bind(requestId).first<Row>();
  if(!request)throw new WorkflowError('Request not found.',404);
  if(request.request_kind==='child'||request.status!=='queue')throw new WorkflowError('Only a queued normal request can enter scope review.',409);
  await db.batch([
    db.prepare("UPDATE requests SET request_kind='parent',scope_status='reviewing',queue_position=NULL WHERE id=?").bind(requestId),
    db.prepare(`INSERT INTO request_activity (request_id,actor_type,actor_id,event_type,label) VALUES (?,'employee',?,'scope_review_started','Scope review started')`).bind(requestId,employeeId),
  ]); return requestId;
}

export async function returnToNormalQueue(db:D1Database,{requestId,employeeId}:{requestId:number;employeeId:number}){
  const request=await db.prepare('SELECT * FROM requests WHERE id=?').bind(requestId).first<Row>();
  if(!request)throw new WorkflowError('Request not found.',404);
  if(request.scope_status==='approved')throw new WorkflowError('An approved request group cannot be converted.',409);
  const position=await nextQueuePosition(db,Number(request.client_id));
  await db.batch([
    db.prepare('DELETE FROM request_breakdown_parts WHERE parent_request_id=?').bind(requestId),
    db.prepare("UPDATE requests SET request_kind='normal',scope_status='none',queue_position=? WHERE id=?").bind(position,requestId),
    db.prepare(`INSERT INTO request_activity (request_id,actor_type,actor_id,event_type,label) VALUES (?,'employee',?,'scope_review_completed','Scope review completed · ready in queue')`).bind(requestId,employeeId),
  ]); return requestId;
}

export async function approveBreakdown(db:D1Database,{parentRequestId,clientId}:{parentRequestId:number;clientId:number}){
  const parent=await db.prepare('SELECT * FROM requests WHERE id=? AND client_id=?').bind(parentRequestId,clientId).first<Row>();
  if(!parent)throw new WorkflowError('Request not found.',404);
  if(parent.request_kind!=='parent')throw new WorkflowError('This request does not have a breakdown.',409);
  const existing=(await db.prepare('SELECT * FROM requests WHERE parent_request_id=? ORDER BY part_number').bind(parentRequestId).all()).results;
  if(parent.scope_status==='approved')return {parent,children:existing,alreadyApproved:true};
  if(parent.scope_status!=='proposed')throw new WorkflowError('The breakdown is not ready for approval.',409);
  const parts=(await db.prepare('SELECT * FROM request_breakdown_parts WHERE parent_request_id=? ORDER BY position').bind(parentRequestId).all<Row>()).results;
  if(parts.length<2)throw new WorkflowError('The proposed breakdown is incomplete.',409);
  const base=await nextQueuePosition(db,clientId); const statements:D1PreparedStatement[]=[];
  for(const part of parts)statements.push(db.prepare(`INSERT INTO requests (project_id,client_id,title,description,type,status,priority,approval_status,request_kind,parent_request_id,scope_status,queue_position,part_number) VALUES (?,?,?,?,?,'queue',?,'pending','child',?,'approved',?,?)`).bind(parent.project_id,parent.client_id,part.title,part.description||parent.description,part.type||parent.type,part.priority,parentRequestId,base+(Number(part.position)-1)*1024,part.position));
  for(const part of parts){
    statements.push(db.prepare(`UPDATE request_breakdown_parts SET child_request_id=(SELECT id FROM requests WHERE parent_request_id=? AND part_number=?) WHERE id=?`).bind(parentRequestId,part.position,part.id));
    if(part.depends_on_part_id)statements.push(db.prepare(`UPDATE requests SET depends_on_request_id=(SELECT child_request_id FROM request_breakdown_parts WHERE id=?) WHERE parent_request_id=? AND part_number=?`).bind(part.depends_on_part_id,parentRequestId,part.position));
    statements.push(db.prepare(`INSERT INTO request_activity (request_id,event_type,label,metadata) SELECT id,'request_created',?,? FROM requests WHERE parent_request_id=? AND part_number=?`).bind(`Part ${String(part.position)} created from ${String(parent.title)}`,JSON.stringify({parent_request_id:parentRequestId,part_number:part.position,part_count:parts.length}),parentRequestId,part.position));
  }
  statements.push(db.prepare(`UPDATE requests SET scope_status='approved',breakdown_approved_at=CURRENT_TIMESTAMP,breakdown_approved_by_client_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(clientId,parentRequestId));
  statements.push(db.prepare(`INSERT INTO request_activity (request_id,actor_type,actor_id,event_type,label,metadata) VALUES (?,'client',?,'breakdown_approved',?,?)`).bind(parentRequestId,clientId,`Breakdown approved · ${parts.length} linked requests created`,JSON.stringify({part_count:parts.length})));
  await db.batch(statements);
  const children=(await db.prepare('SELECT id,title,part_number FROM requests WHERE parent_request_id=? ORDER BY part_number').bind(parentRequestId).all()).results;
  return {parent:{...parent,scope_status:'approved'},children,alreadyApproved:false};
}

export async function reorderClientQueue(db:D1Database,{clientId,orderedIds}:{clientId:number;orderedIds:unknown[]}){
  const ids=[...new Set((orderedIds||[]).map(Number).filter(Number.isInteger))]; if(!ids.length)throw new WorkflowError('ordered_ids required.',400);
  const rows=(await db.prepare(`SELECT id FROM requests WHERE client_id=? AND status='queue' AND request_kind!='parent' ORDER BY COALESCE(queue_position,9223372036854775807),created_at,id`).bind(clientId).all<{id:number}>()).results;
  const available=new Set(rows.map(row=>Number(row.id))); if(rows.length!==ids.length||ids.some(id=>!available.has(id)))throw new WorkflowError('The queue changed. Refresh before reordering.',409);
  await db.batch(ids.map((id,index)=>db.prepare('UPDATE requests SET queue_position=? WHERE id=?').bind((index+1)*1024,id))); return ids;
}

async function slotsFor(db:D1Database,clientId:number){
  const client=await db.prepare('SELECT plan FROM clients WHERE id=?').bind(clientId).first<{plan:string}>();
  const base=client?.plan==='enterprise'?3:client?.plan==='business'?2:1;
  const row=await db.prepare("SELECT COALESCE(SUM(quantity),0) AS extra FROM client_addons WHERE client_id=? AND addon_id='slot' AND status='active'").bind(clientId).first<{extra:number}>();
  return base+Number(row?.extra||0);
}

export async function promoteNextQueued(db:D1Database,clientId:number){
  const slots=await slotsFor(db,clientId); const active=Number((await db.prepare("SELECT COUNT(*) AS active FROM requests WHERE client_id=? AND request_kind!='parent' AND status IN ('in_progress','revision')").bind(clientId).first<{active:number}>())?.active||0);
  if(active>=slots)return null;
  const next=await db.prepare(`SELECT r.id,r.title FROM requests r LEFT JOIN requests dependency ON dependency.id=r.depends_on_request_id WHERE r.client_id=? AND r.request_kind!='parent' AND r.status='queue' AND r.scope_status IN ('none','approved') AND (r.depends_on_request_id IS NULL OR dependency.status='completed') ORDER BY COALESCE(r.queue_position,9223372036854775807),r.created_at,r.id LIMIT 1`).bind(clientId).first<{id:number;title:string}>();
  if(!next)return null;
  await db.batch([db.prepare("UPDATE requests SET status='in_progress',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='queue'").bind(next.id),db.prepare(`INSERT INTO request_activity (request_id,event_type,label) VALUES (?,'request_started','Production started')`).bind(next.id)]);
  return next;
}

export async function productionSlots(db:D1Database,clientId:number){return slotsFor(db,clientId);}
