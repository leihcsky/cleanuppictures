import {getDb} from "~/libs/db";

export const checkAndSaveUser = async (name: string, email: string, image: string, last_login_ip: string) => {
  const db = getDb();
  const safeEmail = (email || '').trim();
  const safeName = (name || '').trim();
  const safeImage = (image || '').trim();
  const safeIp = (last_login_ip || '').split(',')[0].trim();

  const results = await db.query(`select * from users where email=$1 limit 1;`, [safeEmail]);
  const users = results.rows;

  if (users.length <= 0) {
    await db.query(
      'insert into users(email,password_hash,user_name,user_image,is_guest,last_login_ip) values($1,$2,$3,$4,$5,$6)',
      [safeEmail, '', safeName, safeImage, false, safeIp]
    );

    const inserted = await db.query('select * from users where email=$1 limit 1', [safeEmail]);
    const insertedUser = inserted.rows[0];
    if (!insertedUser) {
      return {
        user_id: '',
        name: '',
        email: safeEmail,
        image: '',
        status: 0
      };
    }

    const creditsResult = await db.query('select * from credits where user_id=$1 limit 1', [insertedUser.id]);
    if (creditsResult.rows.length <= 0) {
      await db.query('insert into credits(user_id,balance) values($1,$2)', [insertedUser.id, 0]);
    }
    return {
      user_id: String(insertedUser.id),
      name: insertedUser.user_name || '',
      email: insertedUser.email || safeEmail,
      image: insertedUser.user_image || '',
      status: 1
    };
  } else {
    const user = users[0];
    await db.query('update users set user_name=$1,user_image=$2,last_login_ip=$3 where id=$4',
      [safeName, safeImage, safeIp, user.id]);
    const creditsResult = await db.query('select * from credits where user_id=$1 limit 1', [user.id]);
    if (creditsResult.rows.length <= 0) {
      await db.query('insert into credits(user_id,balance) values($1,$2)', [user.id, 0]);
    }
    return {
      user_id: String(user.id),
      name: safeName || user.user_name || '',
      email: user.email || safeEmail,
      image: safeImage || user.user_image || '',
      status: 1
    };
  }
}

export const getUserById = async (user_id) => {
  const db = getDb();
  const results = await db.query('select * from users where id=$1 limit 1', [Number(user_id)]);
  const users = results.rows;
  if (users.length > 0) {
    const user = users[0];
    return {
      user_id: String(user.id),
      name: user.user_name || '',
      email: user.email,
      image: user.user_image || '',
      status: 1
    }
  }
  return {
    user_id: String(user_id || ''),
    name: '',
    email: '',
    image: '',
    status: 0
  }
}

export const getUserByEmail = async (email) => {
  const db = getDb();
  const results = await db.query('select * from users where email=$1 limit 1', [email]);
  const users = results.rows;
  if (users.length > 0) {
    const user = users[0];
    return {
      user_id: String(user.id),
      name: user.user_name || '',
      email: email,
      image: user.user_image || '',
      status: 1
    }
  }
  return {
    user_id: '',
    name: '',
    email: email,
    image: '',
    status: 0
  }
}
