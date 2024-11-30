import { createServer } from 'net';
import { randomUUID } from 'crypto';
import Database from 'better-sqlite3';

const db = new Database(':memory:');
db.prepare(
  `CREATE TABLE IF NOT EXISTS prices 
  (client_id TEXT, timestamp INTEGER, price INTEGER)`
).run();

const server = createServer();

function send(socket, number) {
  const response = Buffer.alloc(4);
  response.writeInt32BE(number);
  socket.write(response);
}

/**
 * @param {net.Socket} socket The client socket.
 * @param {string} clientId client id.
 * @param {Buffer} data The incoming data.
 */
function handleData(socket, clientId, data) {
  try {
    const type = String.fromCharCode(data.readUInt8(0));
    if (type === 'I') {
      const timestamp = data.readInt32BE(1);
      const price = data.readInt32BE(5);

      db.prepare(
        'INSERT INTO prices (client_id, timestamp, price) VALUES (?, ?, ?)'
      ).run(clientId, timestamp, price);
    } else if (type === 'Q') {
      const mintime = data.readInt32BE(1);
      const maxtime = data.readInt32BE(5);

      const result = db
        .prepare(
          'SELECT avg(price) as price FROM prices WHERE client_id = ? AND timestamp >= ? AND timestamp <= ?'
        )
        .get(clientId, mintime, maxtime);

      send(socket, result?.price || 0);
    } else {
      send(socket, 0);
    }
  } catch (e) {
    console.error(e);
    send(socket, 0);
  }
}

server.on('connection', (socket) => {
  console.log('new client', socket.remoteAddress);

  const clientId = randomUUID();

  let buffer = Buffer.alloc(0);
  socket.on('data', (raw) => {
    if (buffer.length > 0) raw = Buffer.concat([buffer, raw]);
    const remaining = raw.length % 9;
    if (remaining > 0) {
      buffer = Buffer.alloc(remaining);
      raw.copy(buffer, 0, raw.length - remaining);
    } else {
      buffer = Buffer.alloc(0);
    }

    for (let i = 0; i < raw.length - remaining; i += 9) {
      handleData(socket, clientId, raw.subarray(i, i + 9));
    }
  });

  socket.on('end', () => {
    console.log('client ended');
  });
});

server.listen(8000, '0.0.0.0', () => {
  const addr = server.address();
  console.log(`listening at ${addr.address}:${addr.port}`);
});
