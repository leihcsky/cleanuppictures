import { withDbTransaction, tableExists, type DbClient } from "~/libs/db";

type UserRow = {
  id: number;
  is_guest?: boolean | number | null;
  merged_into_user_id?: number | null;
  email?: string | null;
};

function asBool(v: unknown): boolean {
  return v === true || v === 1 || v === "1";
}

/**
 * 将游客用量合并进正式账号：daily_usage 按日相加、credits 余额相加、业务表 user_id 改写，并标记游客 merged_into_user_id。
 * 幂等：已 merged 或非法入参则跳过并返回 false。
 */
export async function mergeGuestIntoAccount(guestUserId: number, accountUserId: number): Promise<boolean> {
  if (!guestUserId || !accountUserId || guestUserId === accountUserId) {
    return false;
  }

  const hasWorksTable = await tableExists("works");
  const hasVisitorsTable = await tableExists("visitors");

  return withDbTransaction(async (tx: DbClient) => {
    const guestRes = await tx.query("SELECT id, is_guest, merged_into_user_id, email FROM users WHERE id = $1 FOR UPDATE", [
      guestUserId
    ]);
    const guestRow = guestRes.rows?.[0] as UserRow | undefined;
    if (!guestRow) return false;
    if (guestRow.merged_into_user_id) return false;
    if (!asBool(guestRow.is_guest)) return false;

    const accRes = await tx.query("SELECT id, is_guest, email FROM users WHERE id = $1 FOR UPDATE", [accountUserId]);
    const accRow = accRes.rows?.[0] as UserRow | undefined;
    if (!accRow) return false;
    if (asBool(accRow.is_guest)) return false;

    const duGuest = await tx.query("SELECT id, date, used_count FROM daily_usage WHERE user_id = $1", [guestUserId]);
    for (const row of duGuest.rows || []) {
      const date = row.date;
      const guestUsed = Number(row.used_count || 0);
      if (!date || guestUsed <= 0) continue;
      const accDu = await tx.query("SELECT id, used_count FROM daily_usage WHERE user_id = $1 AND date = $2 LIMIT 1", [
        accountUserId,
        date
      ]);
      const accExisting = accDu.rows?.[0];
      if (accExisting) {
        const combined = Number(accExisting.used_count || 0) + guestUsed;
        await tx.query("UPDATE daily_usage SET used_count = $1 WHERE id = $2", [combined, accExisting.id]);
      } else {
        await tx.query("INSERT INTO daily_usage (user_id, date, used_count) VALUES ($1, $2, $3)", [
          accountUserId,
          date,
          guestUsed
        ]);
      }
    }
    await tx.query("DELETE FROM daily_usage WHERE user_id = $1", [guestUserId]);

    const cg = await tx.query("SELECT balance FROM credits WHERE user_id = $1 LIMIT 1", [guestUserId]);
    const ca = await tx.query("SELECT balance FROM credits WHERE user_id = $1 LIMIT 1", [accountUserId]);
    const balG = cg.rows?.[0] ? Number(cg.rows[0].balance || 0) : 0;
    const balA = ca.rows?.[0] ? Number(ca.rows[0].balance || 0) : 0;
    if (!ca.rows?.[0]) {
      await tx.query("INSERT INTO credits (user_id, balance) VALUES ($1, $2)", [accountUserId, balG + balA]);
    } else {
      await tx.query("UPDATE credits SET balance = $1, updated_at = NOW() WHERE user_id = $2", [balG + balA, accountUserId]);
    }
    if (cg.rows?.[0]) {
      await tx.query("DELETE FROM credits WHERE user_id = $1", [guestUserId]);
    }

    // Keep audit trail rows bound to original actor ids.
    // images/jobs/credit_transactions remain on guest user for traceability.
    if (hasWorksTable) {
      await tx.query("UPDATE works SET user_id = $1 WHERE user_id = $2", [accountUserId, guestUserId]);
    }
    await tx.query("UPDATE subscriptions SET user_id = $1 WHERE user_id = $2", [accountUserId, guestUserId]);
    await tx.query("UPDATE orders SET user_id = $1 WHERE user_id = $2", [accountUserId, guestUserId]);

    await tx.query("UPDATE users SET merged_into_user_id = $1 WHERE id = $2", [accountUserId, guestUserId]);

    if (hasVisitorsTable) {
      await tx.query(
        "UPDATE visitors SET primary_guest_user_id = NULL, linked_user_id = $1, updated_at = NOW() WHERE primary_guest_user_id = $2 OR id = (SELECT visitor_id FROM users WHERE id = $2 LIMIT 1)",
        [accountUserId, guestUserId, guestUserId]
      );
    }
    return true;
  });
}

export async function mergeGuestIntoAccountIfNeeded(guestUserId: number, accountUserId: number): Promise<boolean> {
  try {
    return await mergeGuestIntoAccount(guestUserId, accountUserId);
  } catch (e) {
    console.error("mergeGuestIntoAccountIfNeeded failed:", e);
    return false;
  }
}
