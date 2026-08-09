import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireEmployee, requireRoles } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const TIME_ACCESS = ['owner','admin','head_of_delivery','head_of_design','head_of_development','project_manager','account_manager','designer','motion_designer','illustrator','copywriter','video_editor','frontend_developer','backend_developer','fullstack_developer','mobile_developer','devops','qa_engineer'];

app.get('/', requireEmployee, requireRoles(...TIME_ACCESS), async (c) => {
  const where:string[]=[]; const params:unknown[]=[];
  const employeeId=c.req.query('employee_id'); const projectId=c.req.query('project_id');
  if (employeeId) { where.push('t.employee_id=?'); params.push(employeeId); }
  if (projectId) { where.push('t.project_id=?'); params.push(projectId); }
  const sql=`SELECT t.*,e.name AS employee_name,p.name AS project_name,r.title AS request_title,cl.name AS client_name
    FROM time_logs t LEFT JOIN employees e ON e.id=t.employee_id LEFT JOIN projects p ON p.id=t.project_id
    LEFT JOIN requests r ON r.id=t.request_id LEFT JOIN clients cl ON cl.id=p.client_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY t.log_date DESC,t.created_at DESC`;
  const {results}=await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({success:true,logs:results});
});

app.post('/', requireEmployee, requireRoles(...TIME_ACCESS), async (c) => {
  const body=await c.req.json<Record<string,unknown>>(); const emp=c.get('employee')!;
  const employeeId=['owner','admin'].includes(emp.role) && body.employee_id ? body.employee_id : emp.id;
  const result=await c.env.DB.prepare('INSERT INTO time_logs (request_id,project_id,employee_id,hours,description,log_date) VALUES (?,?,?,?,?,?)')
    .bind(body.request_id||null,body.project_id||null,employeeId,body.hours,body.description||'',body.log_date||new Date().toISOString().slice(0,10)).run();
  const log=await c.env.DB.prepare('SELECT * FROM time_logs WHERE id=?').bind(result.meta.last_row_id).first();
  return c.json({success:true,log});
});

app.patch('/:id', requireEmployee, requireRoles(...TIME_ACCESS), async (c) => {
  const id=c.req.param('id'); const emp=c.get('employee')!;
  const existing=await c.env.DB.prepare('SELECT * FROM time_logs WHERE id=?').bind(id).first<{employee_id:number}>();
  if (!existing) return c.json({success:false,message:'Time entry not found'},404);
  if (!['owner','admin'].includes(emp.role) && Number(existing.employee_id)!==Number(emp.id)) return c.json({success:false,message:'You can only edit your own time entries'},403);
  const body=await c.req.json<Record<string,unknown>>(); const allowed=['request_id','project_id','hours','description','log_date']; const fields:string[]=[]; const params:unknown[]=[];
  for (const key of allowed) if (body[key]!==undefined) { fields.push(`${key}=?`); params.push(body[key]||null); }
  if (!fields.length) return c.json({success:false,message:'No fields to update'},400);
  await c.env.DB.prepare(`UPDATE time_logs SET ${fields.join(',')} WHERE id=?`).bind(...params,id).run();
  const log=await c.env.DB.prepare('SELECT * FROM time_logs WHERE id=?').bind(id).first();
  return c.json({success:true,log});
});

app.delete('/:id', requireEmployee, requireRoles(...TIME_ACCESS), async (c) => {
  const id=c.req.param('id'); const emp=c.get('employee')!;
  const existing=await c.env.DB.prepare('SELECT employee_id FROM time_logs WHERE id=?').bind(id).first<{employee_id:number}>();
  if (!existing) return c.json({success:false,message:'Time entry not found'},404);
  if (!['owner','admin'].includes(emp.role) && Number(existing.employee_id)!==Number(emp.id)) return c.json({success:false,message:'You can only delete your own time entries'},403);
  await c.env.DB.prepare('DELETE FROM time_logs WHERE id=?').bind(id).run();
  return c.json({success:true});
});

export default app;
