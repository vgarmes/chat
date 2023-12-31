import express from 'express';
import logger from 'morgan';
import { Server } from 'socket.io';
import { createServer } from 'node:http';
import dotenv from 'dotenv';
import { createClient, ResultSet } from '@libsql/client';

dotenv.config();
const port = process.env.PORT ?? 5000;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
});

const db = createClient({
  url: process.env.DB_URL,
  authToken: process.env.DB_TOKEN,
});

await db.execute(
  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    username TEXT
    )
    `
);

io.on('connection', async (socket) => {
  console.log('user has connected');

  socket.on('disconnect', () => {
    console.log('user has disconnected');
  });

  socket.on('chat message', async (msg) => {
    let result: ResultSet;
    const username = socket.handshake.auth.username ?? 'anonymous';
    try {
      result = await db.execute({
        sql: 'INSERT INTO messages (content, username) VALUES (:msg, :username)',
        args: { msg, username },
      });
    } catch (e) {
      console.log(e);
      return;
    }
    io.emit('chat message', msg, result.lastInsertRowid.toString(), username);
  });

  if (!socket.recovered) {
    try {
      const results = await db.execute({
        sql: 'SELECT id, content, username FROM messages WHERE id > ?',
        args: [socket.handshake.auth.serverOffset ?? 0],
      });

      results.rows.forEach((row) => {
        socket.emit(
          'chat message',
          row.content,
          row.id.toString(),
          row.username
        );
      });
    } catch (error) {}
  }
});

app.use(logger('dev'));

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/src/client/index.html');
});

server.listen(port, () => `Server running on port ${port}`);
