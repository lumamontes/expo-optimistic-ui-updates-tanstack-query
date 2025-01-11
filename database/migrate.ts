import { SQLiteDatabase } from "expo-sqlite";

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 2;
  let result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  let currentDbVersion = result ? result.user_version : 0;
  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }
  if (currentDbVersion === 0) {
    await db.execAsync(`
PRAGMA journal_mode = 'wal';
CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY NOT NULL, 
            title TEXT, 
            content TEXT NOT NULL, 
            intValue INTEGER
          );
 CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY NOT NULL, 
            name TEXT NOT NULL
          );
CREATE TABLE IF NOT EXISTS posts_likes (
            post_id INTEGER NOT NULL, 
            user_id INTEGER NOT NULL, 
            PRIMARY KEY (post_id, user_id)
          );
  `);
    await db.runAsync(
      "INSERT INTO posts (title, content, intValue) VALUES (?, ?, ?)",
      ["hello", "Initial content for post 1", 1]
    );
    await db.runAsync(
      "INSERT INTO posts (title, content, intValue) VALUES (?, ?, ?)",
      ["world", "Initial content for post 2", 2]
    );

    await db.runAsync("INSERT INTO users (name) VALUES (?)", [
      "Steven Universo",
    ]);
    await db.runAsync("INSERT INTO users (name) VALUES (?)", ["Pearl"]);

    currentDbVersion = 1;
  }
  if (currentDbVersion === 1) {
    // Add a new column to the posts table of likes_count and comments_count
    await db.execAsync(`
    ALTER TABLE posts ADD COLUMN likes_count INTEGER DEFAULT 0;
    ALTER TABLE posts ADD COLUMN comments_count INTEGER DEFAULT 0;
    `);
    currentDbVersion = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
