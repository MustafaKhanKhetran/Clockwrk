import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee, requireRoles } from '../middleware/auth';

const app=new Hono<{Bindings:Env;Variables:Variables}>();
const PROJECT_ACCESS=['owner','admin','head_of_delivery','head_of_design','head_of_development','project_manager','account_manager','designer','motion_designer','illustrator','copywriter','video_editor','frontend_developer','backend_developer','fullstack_developer','mobile_developer','devops','qa_engineer'];
const LINK_KINDS=new Set(['production','staging','figma','github','appstore','docs','prototype','other']);
const RESOURCE_KINDS=new Set(['brand','website','requirements','competitor','figma','drive','research','other']);
const kind=(value:unknown,allowed:Set<string>)=>allowed.has(String(value||'').toLowerCase())?String(value).toLowerCase():'other';

app.get('/',requireEmployee,requireRoles(...PROJECT_ACCESS),async(c)=>{
  const where:string[]=[]; const params:unknown[]=[];
  for(const [query,column] of [['status','p.status'],['client_id','p.client_id']] as const){const value=c.req.query(query);if(value){where.push(`${column}=?`);params.push(value);}}
  const employeeId=c.req.query('employee_id'); if(employeeId){where.push("(p.project_manager_id=? OR p.id IN (SELECT entity_id FROM assignments WHERE entity_type='project' AND employee_id=?))");params.push(employeeId,employeeId);}
  const sql=`SELECT p.*,c.name AS client_name,c.company AS client_company,c.plan AS client_plan,
    COALESCE(e.name,(SELECT em.name FROM assignments a JOIN employees em ON em.id=a.employee_id WHERE a.entity_type='client' AND a.entity_id=p.client_id AND a.subtype='lead' AND em.role='project_manager' LIMIT 1)) AS pm_name,
    (SELECT em.name FROM assignments a JOIN employees em ON em.id=a.employee_id WHERE a.entity_type='client' AND a.entity_id=p.client_id AND a.subtype='lead' AND em.role='account_manager' LIMIT 1) AS am_name,
    (SELECT COUNT(*) FROM requests r WHERE r.project_id=p.id AND r.status!='completed' AND r.request_kind!='parent') AS active_requests,
    (SELECT COUNT(*) FROM time_logs tl WHERE tl.project_id=p.id) AS total_logs
    FROM projects p LEFT JOIN clients c ON c.id=p.client_id LEFT JOIN employees e ON e.id=p.project_manager_id
    ${where.length?`WHERE ${where.join(' AND ')}`:''} ORDER BY p.created_at DESC`;
  const {results}=await c.env.DB.prepare(sql).bind(...params).all(); return c.json({success:true,projects:results});
});

app.get('/:id',requireEmployee,requireRoles(...PROJECT_ACCESS),async(c)=>{
  const id=c.req.param('id');
  const project=await c.env.DB.prepare(`SELECT p.*,c.name AS client_name,c.company AS client_company,c.email AS client_email,e.name AS project_manager_name
    FROM projects p JOIN clients c ON c.id=p.client_id LEFT JOIN employees e ON e.id=p.project_manager_id WHERE p.id=?`).bind(id).first();
  if(!project)return c.json({success:false,message:'Project not found'},404);
  const [requests,files,links,resources,activity]=await c.env.DB.batch([
    c.env.DB.prepare(`SELECT r.*,e.name AS assigned_to_name,dependency.title AS dependency_title FROM requests r LEFT JOIN employees e ON e.id=r.assigned_to LEFT JOIN requests dependency ON dependency.id=r.depends_on_request_id WHERE r.project_id=? ORDER BY CASE r.status WHEN 'revision' THEN 1 WHEN 'in_review' THEN 2 WHEN 'in_progress' THEN 3 WHEN 'queue' THEN 4 WHEN 'completed' THEN 5 ELSE 6 END,r.queue_position`).bind(id),
    c.env.DB.prepare('SELECT * FROM files WHERE project_id=? ORDER BY created_at DESC').bind(id),
    c.env.DB.prepare('SELECT * FROM project_links WHERE project_id=? ORDER BY id').bind(id),
    c.env.DB.prepare('SELECT * FROM project_resources WHERE project_id=? ORDER BY created_at DESC').bind(id),
    c.env.DB.prepare('SELECT ra.*,r.title AS request_title FROM request_activity ra JOIN requests r ON r.id=ra.request_id WHERE r.project_id=? ORDER BY ra.created_at DESC LIMIT 50').bind(id),
  ]);
  return c.json({success:true,project,requests:requests?.results??[],files:files?.results??[],links:links?.results??[],resources:resources?.results??[],activity:activity?.results??[]});
});

app.post('/',requireEmployee,requireRoles(...PROJECT_ACCESS),async(c)=>{
  const b=await c.req.json<Record<string,unknown>>();
  const result=await c.env.DB.prepare(`INSERT INTO projects (client_id,name,type,icon_emoji,status,notes,goal,audience,success_measure,project_manager_id,priority,start_date,due_date,estimated_hours,github_repo,staging_url,live_url,tech_stack) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(b.client_id,b.name,b.type||null,b.icon_emoji||null,b.status||'active',b.notes||'',b.goal||null,b.audience||null,b.success_measure||null,b.project_manager_id||null,b.priority||'normal',b.start_date||null,b.due_date||null,b.estimated_hours||null,b.github_repo||'',b.staging_url||'',b.live_url||'',b.tech_stack||'').run();
  const project=await c.env.DB.prepare('SELECT * FROM projects WHERE id=?').bind(result.meta.last_row_id).first(); return c.json({success:true,project});
});

app.patch('/:id',requireEmployee,requireRoles(...PROJECT_ACCESS),async(c)=>{
  const b=await c.req.json<Record<string,unknown>>(); const allowed=['name','type','icon_emoji','status','notes','goal','audience','success_measure','project_manager_id','priority','progress_percent','start_date','due_date','estimated_hours','github_repo','staging_url','live_url','tech_stack','health_status']; const fields:string[]=[];const params:unknown[]=[];
  for(const key of allowed)if(b[key]!==undefined){fields.push(`${key}=?`);params.push(b[key]);} if(!fields.length)return c.json({success:false,message:'No fields to update'},400);
  const id=c.req.param('id');await c.env.DB.prepare(`UPDATE projects SET ${fields.join(',')} WHERE id=?`).bind(...params,id).run();const project=await c.env.DB.prepare('SELECT * FROM projects WHERE id=?').bind(id).first();return c.json({success:true,project});
});

app.post('/:id/links',requireEmployee,requireRoles(...PROJECT_ACCESS),async(c)=>{const b=await c.req.json<Record<string,unknown>>();if(!b.label||!b.url)return c.json({success:false,message:'Label and URL are required'},400);const result=await c.env.DB.prepare('INSERT INTO project_links (project_id,kind,label,url) VALUES (?,?,?,?)').bind(c.req.param('id'),kind(b.kind,LINK_KINDS),b.label,b.url).run();const link=await c.env.DB.prepare('SELECT * FROM project_links WHERE id=?').bind(result.meta.last_row_id).first();return c.json({success:true,link});});
app.delete('/:id/links/:linkId',requireEmployee,requireRoles(...PROJECT_ACCESS),async(c)=>{await c.env.DB.prepare('DELETE FROM project_links WHERE id=? AND project_id=?').bind(c.req.param('linkId'),c.req.param('id')).run();return c.json({success:true});});
app.post('/:id/resources',requireEmployee,requireRoles(...PROJECT_ACCESS),async(c)=>{const b=await c.req.json<Record<string,unknown>>();if(!b.title)return c.json({success:false,message:'Title is required'},400);const project=await c.env.DB.prepare('SELECT client_id FROM projects WHERE id=?').bind(c.req.param('id')).first<{client_id:number}>();if(!project)return c.json({success:false,message:'Project not found'},404);const result=await c.env.DB.prepare('INSERT INTO project_resources (project_id,client_id,kind,title,url,file_url,file_name,notes) VALUES (?,?,?,?,?,?,?,?)').bind(c.req.param('id'),project.client_id,kind(b.kind,RESOURCE_KINDS),b.title,b.url||null,b.file_url||null,b.file_name||null,b.notes||null).run();const resource=await c.env.DB.prepare('SELECT * FROM project_resources WHERE id=?').bind(result.meta.last_row_id).first();return c.json({success:true,resource});});

app.delete('/:id',requireEmployee,requireRoles('owner','admin'),async(c)=>{
  const id=c.req.param('id');const project=await c.env.DB.prepare('SELECT id,name,client_id FROM projects WHERE id=?').bind(id).first<{id:number;name:string;client_id:number}>();if(!project)return c.json({success:false,message:'Project not found'},404);
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM files WHERE project_id=? OR request_id IN (SELECT id FROM requests WHERE project_id=?)').bind(id,id),
    c.env.DB.prepare('DELETE FROM time_logs WHERE project_id=? OR request_id IN (SELECT id FROM requests WHERE project_id=?)').bind(id,id),
    c.env.DB.prepare('DELETE FROM request_comments WHERE request_id IN (SELECT id FROM requests WHERE project_id=?)').bind(id),
    c.env.DB.prepare('DELETE FROM client_messages WHERE project_id=?').bind(id),
    c.env.DB.prepare("DELETE FROM assignments WHERE entity_type='project' AND entity_id=?").bind(id),
    c.env.DB.prepare('DELETE FROM projects WHERE id=?').bind(id),
    c.env.DB.prepare(`INSERT INTO audit_logs (employee_id,action,category,entity_type,entity_id,details) VALUES (?,'delete_project','system','project',?,?)`).bind(c.get('employee')!.id,id,JSON.stringify({name:project.name,client_id:project.client_id})),
  ]);
  return c.json({success:true,project:{id:project.id,name:project.name}});
});

export default app;
