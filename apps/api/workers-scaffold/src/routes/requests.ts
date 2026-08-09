import { Hono, type Context } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee, requireRoles } from '../middleware/auth';
import { addRequestActivity, loadBreakdown, markScopeReview, productionSlots, promoteNextQueued, reorderClientQueue, returnToNormalQueue, saveBreakdownProposal, sendBreakdownToClient, WorkflowError } from '../services/requestWorkflow';

const app=new Hono<{Bindings:Env;Variables:Variables}>();
const REQUEST_ACCESS=['owner','admin','head_of_delivery','head_of_design','head_of_development','project_manager','account_manager','designer','motion_designer','illustrator','copywriter','video_editor','frontend_developer','backend_developer','fullstack_developer','mobile_developer','devops','qa_engineer'];
const workflowFailure=(c:Context<{Bindings:Env;Variables:Variables}>,error:unknown)=>{
  const known=error instanceof WorkflowError; if(!known)console.error(error);
  return c.json({success:false,message:known?error.message:'Server error'},known?error.status:500);
};

app.get('/',requireEmployee,requireRoles(...REQUEST_ACCESS),async(c)=>{
  const where:string[]=[];const params:unknown[]=[];
  for(const [name,column] of [['status','r.status'],['client_id','r.client_id'],['project_id','r.project_id']] as const){const value=c.req.query(name);if(value){where.push(`${column}=?`);params.push(value);}}
  const employeeId=c.req.query('employee_id');if(employeeId){where.push("(r.assigned_to=? OR r.id IN (SELECT entity_id FROM assignments WHERE entity_type='request' AND employee_id=? AND subtype='collaborator'))");params.push(employeeId,employeeId);}
  const sql=`SELECT r.*,c.name AS client_name,c.company AS client_company,p.name AS project_name,e.name AS assigned_to_name,parent.title AS parent_title,dependency.title AS dependency_title,
    (SELECT COUNT(*) FROM requests child WHERE child.parent_request_id=r.id) AS child_count,
    (SELECT COUNT(*) FROM request_breakdown_parts bp WHERE bp.parent_request_id=r.id) AS proposed_part_count,
    (SELECT COUNT(*) FROM request_comments rc WHERE rc.request_id=r.id) AS comment_count
    FROM requests r LEFT JOIN clients c ON c.id=r.client_id LEFT JOIN projects p ON p.id=r.project_id LEFT JOIN employees e ON e.id=r.assigned_to LEFT JOIN requests parent ON parent.id=r.parent_request_id LEFT JOIN requests dependency ON dependency.id=r.depends_on_request_id
    ${where.length?`WHERE ${where.join(' AND ')}`:''}
    ORDER BY CASE r.request_kind WHEN 'parent' THEN 0 WHEN 'child' THEN 1 ELSE 2 END,COALESCE(r.parent_request_id,r.id),COALESCE(r.part_number,0),COALESCE(r.queue_position,9223372036854775807),r.created_at DESC`;
  const {results}=await c.env.DB.prepare(sql).bind(...params).all();return c.json({success:true,requests:results});
});

app.post('/',requireEmployee,requireRoles(...REQUEST_ACCESS),async(c)=>{
  const b=await c.req.json<Record<string,unknown>>();if(!b.client_id)return c.json({success:false,message:'client_id is required'},400);
  const status=String(b.status||'queue');
  const result=await c.env.DB.prepare(`INSERT INTO requests (project_id,client_id,assigned_to,title,description,type,status,priority,due_date,estimated_hours,request_kind,scope_status,queue_position,created_at,updated_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,'normal','none',CASE WHEN ?='queue' THEN COALESCE(MAX(queue_position),0)+1024 ELSE NULL END,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
    FROM requests WHERE client_id=? AND status='queue' AND request_kind!='parent'`)
    .bind(b.project_id||null,b.client_id,b.assigned_to||null,b.title,b.description||'',b.type||'',status,b.priority||'normal',b.due_date||null,b.estimated_hours||null,status,b.client_id).run();
  const id=Number(result.meta.last_row_id);await addRequestActivity(c.env.DB,id,'request_created','Request created by the Clockwrk team',{actorType:'employee',actorId:c.get('employee')!.id});
  const request=await c.env.DB.prepare('SELECT * FROM requests WHERE id=?').bind(id).first();return c.json({success:true,request});
});

app.post('/queue/reorder',requireEmployee,requireRoles(...REQUEST_ACCESS),async(c)=>{try{const b=await c.req.json<{client_id:number;ordered_ids:unknown[]}>();const orderedIds=await reorderClientQueue(c.env.DB,{clientId:Number(b.client_id),orderedIds:b.ordered_ids});return c.json({success:true,ordered_ids:orderedIds});}catch(error){return workflowFailure(c,error);}});

app.get('/:id',requireEmployee,requireRoles(...REQUEST_ACCESS),async(c)=>{
  const id=Number(c.req.param('id'));const request=await c.env.DB.prepare(`SELECT r.*,c.name AS client_name,c.company AS client_company,c.plan AS client_plan,p.name AS project_name,e.name AS assigned_to_name,parent.title AS parent_title,dependency.title AS dependency_title,dependency.status AS dependency_status
    FROM requests r JOIN clients c ON c.id=r.client_id JOIN projects p ON p.id=r.project_id LEFT JOIN employees e ON e.id=r.assigned_to LEFT JOIN requests parent ON parent.id=r.parent_request_id LEFT JOIN requests dependency ON dependency.id=r.depends_on_request_id WHERE r.id=?`).bind(id).first();
  if(!request)return c.json({success:false,message:'Request not found'},404);
  const [comments,files,activity,children,team]=await c.env.DB.batch([
    c.env.DB.prepare(`SELECT rc.*,COALESCE(e.name,cl.name) AS author_name,CASE WHEN rc.client_id IS NOT NULL THEN 'client' ELSE 'employee' END AS author_type FROM request_comments rc LEFT JOIN employees e ON e.id=rc.employee_id LEFT JOIN clients cl ON cl.id=rc.client_id WHERE rc.request_id=? ORDER BY rc.created_at`).bind(id),
    c.env.DB.prepare('SELECT * FROM files WHERE request_id=? ORDER BY created_at DESC').bind(id),
    c.env.DB.prepare('SELECT * FROM request_activity WHERE request_id=? ORDER BY created_at DESC').bind(id),
    c.env.DB.prepare('SELECT r.*,dependency.title AS dependency_title FROM requests r LEFT JOIN requests dependency ON dependency.id=r.depends_on_request_id WHERE r.parent_request_id=? ORDER BY r.part_number').bind(id),
    c.env.DB.prepare("SELECT id,name,role,status FROM employees WHERE status='active' ORDER BY name"),
  ]);
  return c.json({success:true,request,comments:comments?.results??[],files:files?.results??[],activity:activity?.results??[],children:children?.results??[],parts:await loadBreakdown(c.env.DB,id),team:team?.results??[]});
});

app.get('/:id/breakdown',requireEmployee,requireRoles(...REQUEST_ACCESS),async(c)=>{const id=Number(c.req.param('id'));const request=await c.env.DB.prepare('SELECT * FROM requests WHERE id=?').bind(id).first();if(!request)return c.json({success:false,message:'Request not found'},404);const children=(await c.env.DB.prepare('SELECT id,title,status,priority,part_number,depends_on_request_id,queue_position FROM requests WHERE parent_request_id=? ORDER BY part_number').bind(id).all()).results;return c.json({success:true,request,parts:await loadBreakdown(c.env.DB,id),children});});
app.post('/:id/scope/start',requireEmployee,requireRoles(...REQUEST_ACCESS),async(c)=>{try{const id=Number(c.req.param('id'));await markScopeReview(c.env.DB,{requestId:id,employeeId:c.get('employee')!.id});const request=await c.env.DB.prepare('SELECT * FROM requests WHERE id=?').bind(id).first();return c.json({success:true,request});}catch(error){return workflowFailure(c,error);}});
app.post('/:id/scope/normal',requireEmployee,requireRoles(...REQUEST_ACCESS),async(c)=>{try{const id=Number(c.req.param('id'));await returnToNormalQueue(c.env.DB,{requestId:id,employeeId:c.get('employee')!.id});const request=await c.env.DB.prepare('SELECT * FROM requests WHERE id=?').bind(id).first();return c.json({success:true,request});}catch(error){return workflowFailure(c,error);}});
app.put('/:id/breakdown',requireEmployee,requireRoles(...REQUEST_ACCESS),async(c)=>{try{const id=Number(c.req.param('id'));const b=await c.req.json<{parts:Parameters<typeof saveBreakdownProposal>[1]['parts'];send_to_client?:boolean}>();const result=await saveBreakdownProposal(c.env.DB,{parentRequestId:id,parts:b.parts,employeeId:c.get('employee')!.id,sendToClient:b.send_to_client===true});const request=await c.env.DB.prepare('SELECT * FROM requests WHERE id=?').bind(id).first();return c.json({success:true,request,parts:result.parts});}catch(error){return workflowFailure(c,error);}});
app.post('/:id/breakdown/send',requireEmployee,requireRoles(...REQUEST_ACCESS),async(c)=>{try{const id=Number(c.req.param('id'));const count=await sendBreakdownToClient(c.env.DB,{parentRequestId:id,employeeId:c.get('employee')!.id});const request=await c.env.DB.prepare('SELECT * FROM requests WHERE id=?').bind(id).first();return c.json({success:true,request,part_count:count});}catch(error){return workflowFailure(c,error);}});

app.patch('/:id',requireEmployee,requireRoles(...REQUEST_ACCESS),async(c)=>{
  const id=Number(c.req.param('id'));const b=await c.req.json<Record<string,unknown>>();const existing=await c.env.DB.prepare('SELECT * FROM requests WHERE id=?').bind(id).first<Record<string,unknown>>();if(!existing)return c.json({success:false,message:'Request not found'},404);
  if(existing.request_kind==='parent'&&b.status&&b.status!==existing.status)return c.json({success:false,message:'A request group status is controlled by its parts.'},409);
  if(b.status==='in_progress'&&existing.status!=='in_progress'){
    if(existing.depends_on_request_id){const dependency=await c.env.DB.prepare('SELECT status,title FROM requests WHERE id=?').bind(existing.depends_on_request_id).first<{status:string;title:string}>();if(dependency&&dependency.status!=='completed')return c.json({success:false,message:`Blocked until ${dependency.title} is delivered.`},409);}
    const slots=await productionSlots(c.env.DB,Number(existing.client_id));const active=Number((await c.env.DB.prepare("SELECT COUNT(*) AS active FROM requests WHERE client_id=? AND request_kind!='parent' AND status IN ('in_progress','revision') AND id!=?").bind(existing.client_id,id).first<{active:number}>())?.active||0);if(active>=slots)return c.json({success:false,message:`All ${slots} production slots are currently in use.`},409);
  }
  const allowed=['title','description','type','status','priority','assigned_to','due_date','estimated_hours','completion_percent','revision_notes','delivery_files','approval_status'];const fields:string[]=[];const params:unknown[]=[];
  for(const key of allowed)if(b[key]!==undefined){fields.push(`${key}=?`);params.push(key==='delivery_files'&&typeof b[key]!=='string'?JSON.stringify(b[key]):b[key]);}
  if(b.status==='completed')fields.push('completed_at=CURRENT_TIMESTAMP');fields.push('updated_at=CURRENT_TIMESTAMP');
  await c.env.DB.prepare(`UPDATE requests SET ${fields.join(',')} WHERE id=?`).bind(...params,id).run();
  if(b.status&&b.status!==existing.status)await addRequestActivity(c.env.DB,id,'status_changed',`Status changed to ${String(b.status).replaceAll('_',' ')}`,{actorType:'employee',actorId:c.get('employee')!.id,metadata:{from:existing.status,to:b.status}});
  const request=await c.env.DB.prepare('SELECT * FROM requests WHERE id=?').bind(id).first();if(b.status==='completed'&&existing.status!=='completed')await promoteNextQueued(c.env.DB,Number(existing.client_id));return c.json({success:true,request});
});

app.get('/:id/comments',requireEmployee,requireRoles(...REQUEST_ACCESS),async(c)=>{const {results}=await c.env.DB.prepare('SELECT rc.*,e.name AS author_name,e.role AS author_role FROM request_comments rc LEFT JOIN employees e ON e.id=rc.employee_id WHERE rc.request_id=? ORDER BY rc.created_at ASC').bind(c.req.param('id')).all();return c.json({success:true,comments:results});});
app.post('/:id/comments',requireEmployee,requireRoles(...REQUEST_ACCESS),async(c)=>{const id=Number(c.req.param('id'));const b=await c.req.json<{comment:string;visibility?:string}>();await c.env.DB.prepare('INSERT INTO request_comments (request_id,employee_id,comment,visibility) VALUES (?,?,?,?)').bind(id,c.get('employee')!.id,b.comment,b.visibility||'internal').run();await addRequestActivity(c.env.DB,id,'team_comment',b.visibility==='client'?'Team replied to the client':'Internal note added',{actorType:'employee',actorId:c.get('employee')!.id});return c.json({success:true});});

export default app;
