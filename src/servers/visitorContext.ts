import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth/next";
import { authOptions } from "~/libs/authOptions";
import { getDb } from "~/libs/db";
import { mergeGuestIntoAccountIfNeeded } from "~/servers/guestMerge";
import { getUserByEmail } from "~/servers/user";

export const VISITOR_COOKIE_KEY = "cp_visitor_id";
export const GUEST_COOKIE_KEY = "cp_guest_user_id";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ApiUserContextResult = {
  userId: number;
  isGuest: boolean;
  /** 免费额度归属（游客登出后可沿用曾登录账号的额度） */
  limitUserId?: number;
  guestCookieValue?: string;
  clearGuestCookie?: boolean;
  /** 新签发 visitor cookie 时带上（首次访问或 cookie 无效重建） */
  visitorCookieValue?: string;
};

function getClientIp(req: NextRequest) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
}

function isGuestRow(v: unknown): boolean {
  return v === true || v === 1 || v === "1";
}

type EnsureVisitorRowResult = {
  id: string;
  isNew: boolean;
  primaryGuestUserId: number;
};

async function ensureVisitorRow(rawCookie: string): Promise<EnsureVisitorRowResult> {
  const db = getDb();
  const fromCookie = (rawCookie || "").trim();
  const uuidOk = UUID_RE.test(fromCookie);

  if (uuidOk) {
    const r = await db.query("select id, primary_guest_user_id from visitors where id = $1 limit 1", [fromCookie]);
    if (r.rows.length > 0) {
      await db.query("update visitors set last_seen_at = now(), updated_at = now() where id = $1", [fromCookie]);
      const pg = r.rows[0].primary_guest_user_id;
      const n = pg != null && pg !== "" ? Number(pg) : 0;
      return { id: fromCookie, isNew: false, primaryGuestUserId: Number.isFinite(n) && n > 0 ? n : 0 };
    }
  }

  const newId = randomUUID();
  await db.query(
    "insert into visitors (id, primary_guest_user_id, linked_user_id, fingerprint_hash, created_at, updated_at, last_seen_at) values ($1, $2, $3, $4, now(), now(), now())",
    [newId, null, null, null]
  );
  return { id: newId, isNew: true, primaryGuestUserId: 0 };
}

/**
 * API Route 用：按 session + cp_visitor_id + cp_guest_user_id 解析计费用户；登录时合并游客；匿名时按 visitor 复用游客行。
 */
async function resolveLoggedInUserId(req: NextRequest): Promise<number> {
  const session = await getServerSession(authOptions);
  let tokenUserId = Number(session?.user?.user_id || 0);
  if (!tokenUserId && session?.user?.email) {
    const row = await getUserByEmail(session.user.email);
    tokenUserId = Number(row?.user_id || 0);
  }
  if (!tokenUserId && process.env.NEXTAUTH_SECRET) {
    try {
      const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (jwt) {
        tokenUserId = Number(jwt.user_id || 0);
        const email = typeof jwt.email === "string" ? jwt.email : "";
        if (!tokenUserId && email) {
          const row = await getUserByEmail(email);
          tokenUserId = Number(row?.user_id || 0);
        }
      }
    } catch {
      /* ignore */
    }
  }
  return Number.isFinite(tokenUserId) && tokenUserId > 0 ? tokenUserId : 0;
}

export async function resolveApiUserContext(req: NextRequest): Promise<ApiUserContextResult> {
  const db = getDb();
  const tokenUserId = await resolveLoggedInUserId(req);
  const cookieGuestId = Number(req.cookies.get(GUEST_COOKIE_KEY)?.value || 0);
  const visitorCookieRaw = req.cookies.get(VISITOR_COOKIE_KEY)?.value || "";
  const vis = await ensureVisitorRow(visitorCookieRaw);
  const visitorId = vis.id;
  const linkedUserRes = await db.query("select linked_user_id from visitors where id = $1 limit 1", [visitorId]);
  const linkedUserId = Number(linkedUserRes.rows?.[0]?.linked_user_id || 0);

  if (tokenUserId > 0) {
    const userRowRes = await db.query("select * from users where id=$1 limit 1", [tokenUserId]);
    if (userRowRes.rows.length > 0) {
      const primaryFromVisitor = vis.primaryGuestUserId;

      const mergeIds: number[] = [];
      if (cookieGuestId > 0 && cookieGuestId !== tokenUserId) mergeIds.push(cookieGuestId);
      if (primaryFromVisitor > 0 && primaryFromVisitor !== tokenUserId && primaryFromVisitor !== cookieGuestId) {
        mergeIds.push(primaryFromVisitor);
      }

      let clearGuestCookie = false;
      for (let i = 0; i < mergeIds.length; i++) {
        const merged = await mergeGuestIntoAccountIfNeeded(mergeIds[i], tokenUserId);
        if (merged) clearGuestCookie = true;
      }

      await db.query(
        "update visitors set linked_user_id = $1, last_seen_at = now(), updated_at = now() where id = $2",
        [tokenUserId, vis.id]
      );
      return {
        userId: tokenUserId,
        isGuest: false,
        limitUserId: tokenUserId,
        guestCookieValue: undefined,
        clearGuestCookie,
        visitorCookieValue: vis.isNew ? vis.id : undefined
      };
    }
  }
  let primaryGuestId = vis.primaryGuestUserId;

  // Visitor has been bound to an account before: treat as the same logical account after logout.
  if (linkedUserId > 0) {
    const mergeIds: number[] = [];
    if (cookieGuestId > 0 && cookieGuestId !== linkedUserId) mergeIds.push(cookieGuestId);
    if (primaryGuestId > 0 && primaryGuestId !== linkedUserId && primaryGuestId !== cookieGuestId) {
      mergeIds.push(primaryGuestId);
    }
    let clearGuestCookie = cookieGuestId > 0;
    for (let i = 0; i < mergeIds.length; i++) {
      const merged = await mergeGuestIntoAccountIfNeeded(mergeIds[i], linkedUserId);
      if (merged) clearGuestCookie = true;
    }
    await db.query(
      "update visitors set primary_guest_user_id = null, last_seen_at = now(), updated_at = now() where id = $1",
      [visitorId]
    );
    return {
      userId: linkedUserId,
      isGuest: false,
      limitUserId: linkedUserId,
      guestCookieValue: undefined,
      clearGuestCookie,
      visitorCookieValue: vis.isNew ? visitorId : undefined
    };
  }

  if (primaryGuestId > 0) {
    const guestRes = await db.query("select * from users where id=$1 limit 1", [primaryGuestId]);
    if (guestRes.rows.length > 0) {
      const row = guestRes.rows[0] as {
        merged_into_user_id?: number | null;
        is_guest?: number | boolean;
      };
      if (row.merged_into_user_id) {
        await db.query("update visitors set primary_guest_user_id = null, updated_at = now() where id = $1", [visitorId]);
        primaryGuestId = 0;
      } else if (isGuestRow(row.is_guest)) {
        return {
          userId: primaryGuestId,
          isGuest: true,
          limitUserId: linkedUserId > 0 ? linkedUserId : primaryGuestId,
          guestCookieValue: String(primaryGuestId),
          clearGuestCookie: false,
          visitorCookieValue: vis.isNew ? visitorId : undefined
        };
      } else {
        await db.query("update visitors set primary_guest_user_id = null, updated_at = now() where id = $1", [visitorId]);
        primaryGuestId = 0;
      }
    } else {
      await db.query("update visitors set primary_guest_user_id = null, updated_at = now() where id = $1", [visitorId]);
      primaryGuestId = 0;
    }
  }

  if (cookieGuestId > 0) {
    const guestRes = await db.query("select * from users where id=$1 limit 1", [cookieGuestId]);
    if (guestRes.rows.length > 0) {
      const row = guestRes.rows[0] as {
        merged_into_user_id?: number | null;
        visitor_id?: string | null;
        is_guest?: number | boolean;
      };
      if (!row.merged_into_user_id && isGuestRow(row.is_guest)) {
        const vid = row.visitor_id ? String(row.visitor_id) : "";
        if (!vid || vid === visitorId) {
          if (!vid) {
            await db.query("update users set visitor_id = $1 where id = $2", [visitorId, cookieGuestId]);
          }
          await db.query(
            "update visitors set primary_guest_user_id = $1, last_seen_at = now(), updated_at = now() where id = $2",
            [cookieGuestId, visitorId]
          );
          return {
            userId: cookieGuestId,
            isGuest: true,
            limitUserId: linkedUserId > 0 ? linkedUserId : cookieGuestId,
            guestCookieValue: String(cookieGuestId),
            clearGuestCookie: false,
            visitorCookieValue: vis.isNew ? visitorId : undefined
          };
        }
      }
    }
  }

  const ip = getClientIp(req);
  const guestName = `Guest_${Date.now()}`;
  const insertRes = await db.query(
    "insert into users(email,password_hash,user_name,user_image,is_guest,last_login_ip,visitor_id) values($1,$2,$3,$4,$5,$6,$7)",
    [null, null, guestName, null, true, ip, visitorId]
  );
  let guestId = Number(insertRes.insertId || 0);
  if (!guestId) {
    const latestRes = await db.query("select id from users where visitor_id=$1 order by id desc limit 1", [visitorId]);
    guestId = Number(latestRes.rows?.[0]?.id || 0);
  }
  await db.query(
    "update visitors set primary_guest_user_id = $1, last_seen_at = now(), updated_at = now() where id = $2",
    [guestId, visitorId]
  );
  return {
    userId: guestId,
    isGuest: true,
    limitUserId: linkedUserId > 0 ? linkedUserId : guestId,
    guestCookieValue: String(guestId),
    clearGuestCookie: false,
    visitorCookieValue: vis.isNew ? visitorId : undefined
  };
}
