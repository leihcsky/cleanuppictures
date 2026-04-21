import { getDb } from "~/libs/db";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = Number((token as any)?.user_id || 0);
  if (!userId) {
    return Response.json({ status: 0, items: [] }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") || 1) || 1);
  const pageSize = Math.min(24, Math.max(1, Number(sp.get("pageSize") || 8) || 8));
  const offset = (page - 1) * pageSize;

  const db = getDb();
  const countRes = await db.query(
    "select count(*) as total from jobs where user_id=$1",
    [userId]
  );
  const total = Number(countRes.rows?.[0]?.total || 0);
  const res = await db.query(
    `select
       j.id,
       j.mode,
       j.status,
       j.credit_cost,
       j.is_hd,
       j.created_at,
       DATE_FORMAT(j.created_at, '%Y-%m-%d %H:%i:%s') as created_at_text,
       i.url as source_url,
       rr.image_url as result_url,
       rr.resolution as result_resolution
     from jobs j
     left join images i on i.id = j.image_id
     left join (
       select r1.job_id, r1.image_url, r1.resolution
       from results r1
       inner join (
         select job_id, max(id) as max_id
         from results
         group by job_id
       ) r2 on r1.id = r2.max_id
     ) rr on rr.job_id = j.id
     where j.user_id = $1
     order by j.id desc
     limit $2 offset $3`,
    [userId, pageSize, offset]
  );

  const items = (res.rows || []).map((row: any) => ({
    id: Number(row.id || 0),
    mode: String(row.mode || ""),
    status: String(row.status || ""),
    credit_cost: Number(row.credit_cost || 0),
    is_hd: Boolean(row.is_hd),
    created_at: row.created_at,
    created_at_text: String(row.created_at_text || ""),
    source_url: String(row.source_url || ""),
    result_url: String(row.result_url || ""),
    result_resolution: String(row.result_resolution || "")
  }));

  return Response.json({
    status: 1,
    items,
    page,
    page_size: pageSize,
    total,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
    has_more: page * pageSize < total
  });
}

