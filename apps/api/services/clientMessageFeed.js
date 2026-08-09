import db from '../db.js';

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = asDate(value);
  return date ? date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
};

const money = (value) => `$${Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const systemMessage = ({ id, clientId, projectId = null, type, title, content, createdAt, projectName = null }) => ({
  id,
  client_id: clientId,
  project_id: projectId,
  sender: 'system',
  event_type: type,
  event_title: title,
  content,
  created_at: createdAt,
  project_name: projectName,
  attachments: [],
  synthetic: true,
});

const sortByCreatedAt = (rows) => rows.sort((left, right) => {
  const leftTime = asDate(left.created_at)?.getTime() || 0;
  const rightTime = asDate(right.created_at)?.getTime() || 0;
  return leftTime - rightTime;
});

async function attachFiles(messages) {
  const persisted = messages.filter((message) => Number.isInteger(Number(message.id)));
  if (!persisted.length) return;
  const ids = persisted.map((message) => Number(message.id));
  const [files] = await db.execute(
    `SELECT id, message_id, file_name AS name, file_url AS url, file_type
       FROM files WHERE message_id IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const grouped = files.reduce((result, file) => {
    (result[file.message_id] ||= []).push({ ...file, mime: file.file_type });
    return result;
  }, {});
  persisted.forEach((message) => { message.attachments = grouped[message.id] || []; });
}

function billingSummary(client) {
  const nextTransfer = formatDate(client.next_payment_due);
  const statusLine = client.status === 'active'
    ? 'Your account is active.'
    : `Your account is ${client.status}. The team can help you restore service.`;
  return systemMessage({
    id: `account-${client.id}`,
    clientId: client.id,
    type: client.status === 'active' ? 'billing' : 'alert',
    title: client.status === 'active' ? 'Billing details' : 'Account alert',
    content: `${client.plan} plan · ${client.billing} transfers. ${nextTransfer ? `Your next transfer is due ${nextTransfer}. ` : ''}${statusLine}`,
    createdAt: client.subscribed_at,
  });
}

function paymentMessage(client, payment, existingMessages) {
  const invoiceId = `INV-${String(payment.id).padStart(4, '0')}`;
  if (existingMessages.some((message) => message.content?.includes(invoiceId))) return null;
  const date = formatDate(payment.confirmed_at || payment.submitted_at);
  if (payment.status === 'confirmed') {
    return systemMessage({ id: `payment-${payment.id}`, clientId: client.id, type: 'billing', title: 'Transfer confirmed', content: `${invoiceId} · ${money(payment.amount)} received${date ? ` on ${date}` : ''}.`, createdAt: payment.confirmed_at || payment.submitted_at });
  }
  if (payment.status === 'pending') {
    return systemMessage({ id: `payment-${payment.id}`, clientId: client.id, type: 'alert', title: 'Transfer awaiting confirmation', content: `${invoiceId} · ${money(payment.amount)} has been reported and is awaiting verification by the Clockwrk team.`, createdAt: payment.submitted_at });
  }
  return systemMessage({ id: `payment-${payment.id}`, clientId: client.id, type: 'alert', title: 'Transfer needs attention', content: `${invoiceId} · ${money(payment.amount)} could not be verified. Message the team here for help.`, createdAt: payment.submitted_at });
}

function changeMessage(client, change) {
  const labels = { plan: 'Plan change', addon: 'Add-on change', cadence: 'Billing cadence change', retainer: 'Retainer change' };
  const effective = formatDate(change.effective_date || change.new_billing_date);
  const amount = Number(change.amount_due || 0) > 0 ? ` · ${money(change.amount_due)} transfer required` : '';
  return systemMessage({
    id: `subscription-${change.id}`,
    clientId: client.id,
    type: ['rejected', 'expired'].includes(change.status) ? 'alert' : 'billing',
    title: labels[change.kind] || 'Subscription update',
    content: `${change.direction} to ${change.to_value}${change.target_cadence ? ` · ${change.target_cadence}` : ''}${amount}. Status: ${change.status.replaceAll('_', ' ')}${effective ? ` · effective ${effective}` : ''}.`,
    createdAt: change.verified_at || change.reported_at || change.requested_at,
  });
}

/** Returns one exact conversation. NULL project means Team & alerts. */
export async function getClientMessageFeed({ clientId, projectId = null }) {
  const [[client]] = await db.execute(
    `SELECT id, name, email, company, plan, billing, status, subscribed_at, next_payment_due
       FROM clients WHERE id = ?`,
    [clientId]
  );
  if (!client) return null;

  let project = null;
  if (projectId !== null) {
    [[project]] = await db.execute('SELECT id, name FROM projects WHERE id = ? AND client_id = ?', [projectId, clientId]);
    if (!project) return null;
  }

  const [messages] = await db.execute(
    `SELECT m.id, m.client_id, m.project_id, m.sender, m.content, m.created_at,
            'chat' AS event_type, p.name AS project_name
       FROM client_messages m
       LEFT JOIN projects p ON p.id = m.project_id
      WHERE m.client_id = ? AND m.project_id ${project ? '= ?' : 'IS NULL'}
      ORDER BY m.created_at ASC`,
    project ? [clientId, project.id] : [clientId]
  );
  if (!project) {
    messages.forEach((message) => {
      if (message.sender === 'team' && /^Payment confirmed\b/i.test(message.content || '')) {
        message.sender = 'system';
        message.event_type = 'billing';
        message.event_title = 'Transfer confirmed';
      }
    });
  }
  await attachFiles(messages);

  const events = [];
  if (!project) {
    events.push(billingSummary(client));
    const [payments] = await db.execute(
      `SELECT id, amount, status, submitted_at, confirmed_at FROM payments
        WHERE client_id = ? OR (client_id IS NULL AND email = ?) ORDER BY submitted_at ASC`,
      [client.id, client.email]
    );
    payments.forEach((payment) => {
      const event = paymentMessage(client, payment, messages);
      if (event) events.push(event);
    });
    const [changes] = await db.execute(
      `SELECT id, kind, direction, to_value, target_cadence, amount_due, status,
              effective_date, new_billing_date, requested_at, reported_at, verified_at
         FROM subscription_changes WHERE client_id = ? ORDER BY requested_at ASC`,
      [client.id]
    );
    changes.forEach((change) => events.push(changeMessage(client, change)));
  } else {
    const [requests] = await db.execute(
      `SELECT id, title, status, updated_at, completed_at FROM requests
        WHERE client_id = ? AND project_id = ? AND request_kind != 'parent'
          AND status IN ('in_review', 'completed')
        ORDER BY COALESCE(completed_at, updated_at) ASC`,
      [client.id, project.id]
    );
    requests.forEach((request) => events.push(systemMessage({
      id: `delivery-${request.id}-${request.status}`,
      clientId: client.id,
      projectId: project.id,
      projectName: project.name,
      type: 'delivery',
      title: request.status === 'in_review' ? 'Request delivered' : 'Request completed',
      content: request.status === 'in_review' ? `${request.title} is ready for your review.` : `${request.title} was approved and completed.`,
      createdAt: request.completed_at || request.updated_at,
    })));
  }
  return { client, project, messages: sortByCreatedAt([...messages, ...events]) };
}

/** Lists every account and project channel even when no chat rows exist yet. */
export async function getCommunicationChannels() {
  const [clients] = await db.execute(
    `SELECT id, name, email, company, plan, billing, status, subscribed_at FROM clients
      ORDER BY COALESCE(company, name), name`
  );
  const [projects] = await db.execute(
    `SELECT p.id, p.client_id, p.name, p.status, p.created_at FROM projects p
      JOIN clients c ON c.id = p.client_id ORDER BY COALESCE(c.company, c.name), p.name`
  );
  const [latestMessages] = await db.execute(
    `SELECT client_id, project_id, content, sender, created_at FROM client_messages ORDER BY created_at DESC`
  );
  const latestByChannel = new Map();
  latestMessages.forEach((message) => {
    const key = `${message.client_id}:${message.project_id || 'team'}`;
    if (!latestByChannel.has(key)) latestByChannel.set(key, message);
  });

  const channels = [];
  clients.forEach((client) => {
    const latest = latestByChannel.get(`${client.id}:team`);
    channels.push({ id: `team:${client.id}`, type: 'team', client_id: client.id, project_id: null, title: 'Team & alerts', client_name: client.name, client_company: client.company, client_email: client.email, latest_content: latest?.content || `${client.plan} · ${client.billing} account updates`, latest_sender: latest?.sender || 'system', latest_at: latest?.created_at || client.subscribed_at });
  });
  projects.forEach((project) => {
    const client = clients.find((item) => item.id === project.client_id);
    const latest = latestByChannel.get(`${project.client_id}:${project.id}`);
    channels.push({ id: `project:${project.id}`, type: 'project', client_id: project.client_id, project_id: project.id, title: project.name, client_name: client?.name, client_company: client?.company, client_email: client?.email, latest_content: latest?.content || 'Project conversation', latest_sender: latest?.sender || 'system', latest_at: latest?.created_at || project.created_at });
  });
  return channels.sort((left, right) => {
    const company = String(left.client_company || left.client_name).localeCompare(String(right.client_company || right.client_name));
    if (company) return company;
    if (left.type !== right.type) return left.type === 'team' ? -1 : 1;
    return left.title.localeCompare(right.title);
  });
}
