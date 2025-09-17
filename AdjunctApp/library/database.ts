// library/database.ts
import * as SQLite from "expo-sqlite";
import { supabase } from "../lib/supabase";

// open database
const db = SQLite.openDatabaseSync("app.db");

// ------------------ SCHEMA CREATION ------------------
export const initLocalDB = async () => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_phone TEXT,
      receiver_phone TEXT,
      message TEXT,
      created_at TEXT,
      is_ai INTEGER,
      reply_to_message TEXT,
      is_read INTEGER,
      ciphertext TEXT,
      nonce TEXT,
      mode TEXT,
      media_url TEXT,
      media_type TEXT,
      file_name TEXT,
      file_size INTEGER,
      pending_sync INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY,
      phone_number TEXT UNIQUE,
      name TEXT,
      profile_picture TEXT,
      is_active INTEGER,
      created_at TEXT,
      updated_at TEXT,
      public_key TEXT,
      google_access_token TEXT,
      google_refresh_token TEXT,
      google_user_id TEXT,
      google_email TEXT,
      lock_password TEXT,
      pending_sync INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS chatbotmessages (
      id TEXT PRIMARY KEY,
      sender_phone TEXT,
      text TEXT,
      is_ai INTEGER,
      created_at TEXT,
      pending_sync INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      sender_phone TEXT,
      title TEXT,
      
      created_at TEXT,
      pending_sync INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS usersmodes (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE,
      mode TEXT,
      created_at TEXT,
      updated_at TEXT,
      pending_sync INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_phone TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  profile_picture TEXT,
  last_message TEXT NOT NULL,
  last_message_time TEXT NOT NULL,
  unread_count INTEGER DEFAULT 0,
  is_group INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  pending_sync INTEGER DEFAULT 0,
  deleted INTEGER DEFAULT 0,
  last_synced_at TEXT
);
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT,
      direction TEXT,
      record_count INTEGER,
      status TEXT,
      timestamp TEXT
    );
  `);

  console.log("✅ Local DB initialized");
};

// ------------------ HELPERS ------------------
export const insertLocal = async (table: string, record: any) => {
  const keys = Object.keys(record).join(", ");
  const placeholders = Object.keys(record).map(() => "?").join(", ");
  const values = Object.values(record) as SQLite.SQLiteBindValue[];

  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO ${table} (${keys}, pending_sync) VALUES (${placeholders}, 1);`,
      values
    );
    console.log(`✅ Inserted/Updated record into ${table}:`, record);
  } catch (err) {
    console.error(`❌ Insert error in ${table}:`, err);
  }
};

export const fetchLocal = async (table: string): Promise<any[]> => {
  try {
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM ${table} WHERE deleted = 0;`
    );
    console.log(`📂 Fetched ${rows.length} rows from ${table}`);
    return rows;
  } catch (err) {
    console.error(`❌ Fetch error in ${table}:`, err);
    return [];
  }
};

// ------------------ SYNC HELPERS ------------------
const logSync = async (
  table: string,
  direction: string,
  count: number,
  status: string
) => {
  await db.runAsync(
    `INSERT INTO sync_log (table_name, direction, record_count, status, timestamp) VALUES (?, ?, ?, ?, ?);`,
    [table, direction, count, status, new Date().toISOString()]
  );
};

export const syncToSupabase = async (table: string) => {
  try {
    
    const unsynced = await db.getAllAsync<any>(
      `SELECT * FROM ${table} WHERE pending_sync = 1 AND deleted = 0;`
    );

    console.log(`[SYNC →] ${table} unsynced records:`, unsynced);

    if (unsynced.length === 0) {
      await logSync(table, "push", 0, "ok");
      return;
    }

    const { error } = await supabase.from(table).upsert(unsynced);
    if (error) {
      console.error(`[SYNC → ERROR] ${table}:`, error.message);
      await logSync(table, "push", unsynced.length, "error");
      return;
    }

    console.log(`[SYNC →] Pushed ${unsynced.length} records to Supabase (${table})`);

    // Get the correct primary key column for each table
    const getPrimaryKey = (tableName: string) => {
      switch (tableName) {
        case 'profiles':
          return 'user_id';
        case 'usersmodes':
          return 'id'; // or phone if that's the primary key
        default:
          return 'id';
      }
    };

    const primaryKey = getPrimaryKey(table);

    for (const record of unsynced) {
      await db.runAsync(
        `UPDATE ${table} SET pending_sync = 0, last_synced_at = ? WHERE ${primaryKey} = ?;`,
        [new Date().toISOString(), record[primaryKey]]
      );
    }

    await logSync(table, "push", unsynced.length, "ok");
  } catch (err) {
    console.error(`[SYNC → CRASH] ${table}:`, err);
    await logSync(table, "push", 0, "crash");
  }
};

export const cleanupInvalidUUIDs = async () => {
  try {
    // Delete records with invalid UUID format (timestamp-based IDs)
    await db.runAsync(
      `DELETE FROM profiles WHERE user_id NOT LIKE '________-____-4___-____-____________';`
    );
    
    // Also clean up any other tables that might have invalid UUIDs
    const tables = ["messages", "chatbotmessages", "todos"];
    for (const table of tables) {
      if (table === "messages") {
        // For messages, the id field should be UUID
        await db.runAsync(
          `DELETE FROM ${table} WHERE id NOT LIKE '________-____-4___-____-____________';`
        );
      }
    }
    
    console.log("✅ Cleaned up invalid UUID records");
  } catch (err) {
    console.error("❌ Error cleaning up invalid UUIDs:", err);
  }
};

export const syncFromSupabase = async (table: string) => {
  try {
    await cleanupInvalidUUIDs();
    const { data, error } = await supabase.from(table).select("*");
    
    if (error) {
      console.error(`[SYNC ← ERROR] ${table}:`, error.message);
      await logSync(table, "pull", 0, "error");
      return;
    }

    console.log(`[SYNC ←] Pulled ${data?.length || 0} records from Supabase`);

    for (const record of data || []) {
      const keys = Object.keys(record).join(", ");
      const placeholders = Object.keys(record).map(() => "?").join(", ");
      const values = Object.values(record) as SQLite.SQLiteBindValue[];

      await db.runAsync(
        `INSERT OR REPLACE INTO ${table} (${keys}, pending_sync, deleted, last_synced_at) VALUES (${placeholders}, 0, 0, ?);`,
        [...values, new Date().toISOString()]
      );
    }

    await logSync(table, "pull", data?.length || 0, "ok");
  } catch (err) {
    console.error(`[SYNC ← CRASH] ${table}:`, err);
    await logSync(table, "pull", 0, "crash");
  }
};

// ------------------ MASTER SYNC ------------------
export const fullSync = async () => {
  const tables = ["messages", "profiles", "chatbotmessages", "todos", "usersmodes"];
  console.log("🔄 Starting full sync...");
  
  for (let t of tables) {
    await syncToSupabase(t);
    await syncFromSupabase(t);
  }
  console.log("✅ Full sync completed!");
};

// ------------------ DEBUGGING HELPERS ------------------
export const fetchSyncLog = async () => {
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM sync_log ORDER BY timestamp DESC LIMIT 20;"
  );
  console.log("📝 Last sync logs:", rows);
  return rows;
}