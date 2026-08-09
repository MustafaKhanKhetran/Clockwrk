const asDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};
const formatDate = (value: unknown) =>
  asDate(value)?.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }) ?? null;
const money = (value: unknown) =>
  `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
type Row = Record<string, any>;
const systemMessage = (input: Row) => ({
  id: input.id,
  client_id: input.clientId,
  project_id: input.projectId ?? null,
  sender: "system",
  event_type: input.type,
  event_title: input.title,
  content: input.content,
  created_at: input.createdAt,
  project_name: input.projectName ?? null,
  attachments: [],
  synthetic: true,
});

export async function getClientMessageFeed(
  db: D1Database,
  clientId: number,
  projectId: number | null = null,
) {
  const client = await db
    .prepare(
      "SELECT id,name,email,company,plan,billing,status,subscribed_at,next_payment_due FROM clients WHERE id=?",
    )
    .bind(clientId)
    .first<Row>();
  if (!client) return null;
  const project =
    projectId === null
      ? null
      : await db
          .prepare("SELECT id,name FROM projects WHERE id=? AND client_id=?")
          .bind(projectId, clientId)
          .first<Row>();
  if (projectId !== null && !project) return null;
  const messages = (
    await db
      .prepare(
        `SELECT m.id,m.client_id,m.project_id,m.sender,m.content,m.created_at,'chat' AS event_type,p.name AS project_name FROM client_messages m LEFT JOIN projects p ON p.id=m.project_id WHERE m.client_id=? AND m.project_id ${project ? "=?" : "IS NULL"} ORDER BY m.created_at`,
      )
      .bind(...(project ? [clientId, project.id] : [clientId]))
      .all<Row>()
  ).results;
  if (!project)
    for (const message of messages)
      if (
        message.sender === "team" &&
        /^Payment confirmed\b/i.test(String(message.content || ""))
      ) {
        message.sender = "system";
        message.event_type = "billing";
        message.event_title = "Transfer confirmed";
      }
  if (messages.length) {
    const ids = messages.map((message) => Number(message.id));
    const files = (
      await db
        .prepare(
          `SELECT id,message_id,file_name AS name,file_url AS url,file_type FROM files WHERE message_id IN (${ids.map(() => "?").join(",")})`,
        )
        .bind(...ids)
        .all<Row>()
    ).results;
    for (const message of messages)
      message.attachments = files
        .filter((file) => Number(file.message_id) === Number(message.id))
        .map((file) => ({ ...file, mime: file.file_type }));
  }
  const events: Row[] = [];
  if (!project) {
    const next = formatDate(client.next_payment_due);
    events.push(
      systemMessage({
        id: `account-${client.id}`,
        clientId,
        type: client.status === "active" ? "billing" : "alert",
        title: client.status === "active" ? "Billing details" : "Account alert",
        content: `${client.plan} plan · ${client.billing} transfers. ${next ? `Your next transfer is due ${next}. ` : ""}${client.status === "active" ? "Your account is active." : `Your account is ${client.status}. The team can help you restore service.`}`,
        createdAt: client.subscribed_at,
      }),
    );
    const payments = (
      await db
        .prepare(
          "SELECT id,amount,status,submitted_at,confirmed_at FROM payments WHERE client_id=? OR (client_id IS NULL AND email=?) ORDER BY submitted_at",
        )
        .bind(client.id, client.email)
        .all<Row>()
    ).results;
    for (const payment of payments) {
      const invoice = `INV-${String(payment.id).padStart(4, "0")}`;
      if (messages.some((message) => String(message.content).includes(invoice)))
        continue;
      const date = formatDate(payment.confirmed_at || payment.submitted_at);
      events.push(
        systemMessage({
          id: `payment-${payment.id}`,
          clientId,
          type: payment.status === "confirmed" ? "billing" : "alert",
          title:
            payment.status === "confirmed"
              ? "Transfer confirmed"
              : payment.status === "pending"
                ? "Transfer awaiting confirmation"
                : "Transfer needs attention",
          content:
            payment.status === "confirmed"
              ? `${invoice} · ${money(payment.amount)} received${date ? ` on ${date}` : ""}.`
              : payment.status === "pending"
                ? `${invoice} · ${money(payment.amount)} has been reported and is awaiting verification by the Clockwrk team.`
                : `${invoice} · ${money(payment.amount)} could not be verified. Message the team here for help.`,
          createdAt: payment.confirmed_at || payment.submitted_at,
        }),
      );
    }
    const changes = (
      await db
        .prepare(
          "SELECT id,kind,direction,to_value,target_cadence,amount_due,status,effective_date,new_billing_date,requested_at,reported_at,verified_at FROM subscription_changes WHERE client_id=? ORDER BY requested_at",
        )
        .bind(clientId)
        .all<Row>()
    ).results;
    const labels: Row = {
      plan: "Plan change",
      addon: "Add-on change",
      cadence: "Billing cadence change",
      retainer: "Retainer change",
    };
    for (const change of changes) {
      const effective = formatDate(
        change.effective_date || change.new_billing_date,
      );
      events.push(
        systemMessage({
          id: `subscription-${change.id}`,
          clientId,
          type: ["rejected", "expired"].includes(change.status)
            ? "alert"
            : "billing",
          title: labels[change.kind] || "Subscription update",
          content: `${change.direction} to ${change.to_value}${change.target_cadence ? ` · ${change.target_cadence}` : ""}${Number(change.amount_due || 0) > 0 ? ` · ${money(change.amount_due)} transfer required` : ""}. Status: ${String(change.status).replaceAll("_", " ")}${effective ? ` · effective ${effective}` : ""}.`,
          createdAt:
            change.verified_at || change.reported_at || change.requested_at,
        }),
      );
    }
  } else {
    const requests = (
      await db
        .prepare(
          "SELECT id,title,status,updated_at,completed_at FROM requests WHERE client_id=? AND project_id=? AND request_kind!='parent' AND status IN ('in_review','completed') ORDER BY COALESCE(completed_at,updated_at)",
        )
        .bind(clientId, project.id)
        .all<Row>()
    ).results;
    for (const request of requests)
      events.push(
        systemMessage({
          id: `delivery-${request.id}-${request.status}`,
          clientId,
          projectId: project.id,
          projectName: project.name,
          type: "delivery",
          title:
            request.status === "in_review"
              ? "Request delivered"
              : "Request completed",
          content:
            request.status === "in_review"
              ? `${request.title} is ready for your review.`
              : `${request.title} was approved and completed.`,
          createdAt: request.completed_at || request.updated_at,
        }),
      );
  }
  return {
    client,
    project,
    messages: [...messages, ...events].sort(
      (a, b) =>
        (asDate(a.created_at)?.getTime() || 0) -
        (asDate(b.created_at)?.getTime() || 0),
    ),
  };
}

export async function deleteProjectTree(
  db: D1Database,
  projectId: number,
  clientId: number,
) {
  const project = await db
    .prepare(
      "SELECT id,name,client_id FROM projects WHERE id=? AND client_id=?",
    )
    .bind(projectId, clientId)
    .first<Row>();
  if (!project) return null;
  const requests = (
    await db
      .prepare("SELECT id FROM requests WHERE project_id=?")
      .bind(projectId)
      .all<{ id: number }>()
  ).results;
  const ids = requests.map((row) => row.id);
  const statements: D1PreparedStatement[] = [];
  if (ids.length) {
    const placeholders = ids.map(() => "?").join(",");
    statements.push(
      db
        .prepare(
          `DELETE FROM files WHERE project_id=? OR request_id IN (${placeholders})`,
        )
        .bind(projectId, ...ids),
      db
        .prepare(
          `DELETE FROM time_logs WHERE project_id=? OR request_id IN (${placeholders})`,
        )
        .bind(projectId, ...ids),
      db
        .prepare(
          `DELETE FROM request_comments WHERE request_id IN (${placeholders})`,
        )
        .bind(...ids),
    );
  } else {
    statements.push(
      db.prepare("DELETE FROM files WHERE project_id=?").bind(projectId),
      db.prepare("DELETE FROM time_logs WHERE project_id=?").bind(projectId),
    );
  }
  statements.push(
    db
      .prepare("DELETE FROM client_messages WHERE project_id=?")
      .bind(projectId),
    db
      .prepare(
        "DELETE FROM assignments WHERE entity_type='project' AND entity_id=?",
      )
      .bind(projectId),
    db.prepare("DELETE FROM projects WHERE id=?").bind(projectId),
  );
  await db.batch(statements);
  return project;
}
