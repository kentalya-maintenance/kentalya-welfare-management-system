
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import readline from 'node:readline';

dotenv.config({ path: '.env.local' });

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    let answer = '';

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function cleanup() {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      process.stdout.write('\n');
    }

    function onData(char) {
      if (char === '\u0003') {
        cleanup();
        process.exit(1);
      }

      if (char === '\r' || char === '\n') {
        cleanup();
        resolve(answer);
        return;
      }

      if (char === '\u007f' || char === '\b') {
        answer = answer.slice(0, -1);
        return;
      }

      if (char >= ' ') {
        answer += char;
      }
    }

    stdin.on('data', onData);
  });
}

async function main() {
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    throw new Error('Database settings are missing from .env.local.');
  }

  const username = await ask('Administrator username: ');

  if (!/^[a-zA-Z0-9._-]{3,100}$/.test(username)) {
    throw new Error('Username must be 3–100 characters: letters, numbers, dot, underscore or hyphen.');
  }

  const password = await askHidden('Administrator password: ');
  const confirmation = await askHidden('Confirm password: ');

  if (password.length < 12) {
    throw new Error('Password must contain at least 12 characters.');
  }

  if (password !== confirmation) {
    throw new Error('Passwords do not match.');
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  });

  try {
    const [existing] = await connection.execute(
      'SELECT id FROM app_users WHERE username = ? LIMIT 1',
      [username],
    );

    if (existing.length > 0) {
      throw new Error('That username already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await connection.execute(
      `INSERT INTO app_users
       (username, password_hash, role, is_active)
       VALUES (?, ?, 'system_admin', 'yes')`,
      [username, passwordHash],
    );

    console.log('\nAdministrator account created successfully.');
    console.log('Username:', username);
    console.log('Role: system_admin');
    console.log('Active: yes');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('\nAdministrator setup failed:', error.message);
  process.exitCode = 1;
});
