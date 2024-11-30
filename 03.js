import { randomUUID } from 'crypto';
import { createServer } from 'net';

const server = createServer();

const clients = [];

function client(socket) {
  let id = randomUUID();
  let username = '';

  let state = 'wait-for-user';

  function getName() {
    return username;
  }

  function send(data) {
    if (state === 'idle') {
      console.log('send', data);
      socket.write(data + '\n');
    }
  }

  /**
   * @param {net.Socket} socket The client socket.
   * @param {string} data The incoming data.
   */
  function handleData(data) {
    console.log('got', data);
    if (state === 'wait-for-user') {
      if (!data.match(/^\w+$/)) return false;

      username = data;
      state = 'idle';
      for (const c of clients) {
        if (c.id !== id) {
          c.send(`* ${username} joined the chat`);
        }
      }
      if (clients.length === 1) {
        send(`* The room is empty`);
      } else {
        send(
          `* The room contains ${clients
            .filter((c) => c.id !== id)
            .map((c) => c.getName())
            .join(',')}`
        );
      }
    } else if (state === 'idle') {
      for (const c of clients) {
        if (c.id !== id) {
          c.send(`[${username}] ${data}`);
        }
      }
    }
    return true;
  }

  socket.write('give me your name, now!\n');

  return { id, getName, handleData, send };
}

server.on('connection', (socket) => {
  console.log('new client', socket.remoteAddress);

  const c = client(socket);
  clients.push(c);

  let buffer = '';
  socket.on('data', (raw) => {
    const data = raw.toString();
    if (data.indexOf('\n') === -1) {
      buffer += data;
    } else {
      const reqs = (buffer + data).split('\n');
      const last = reqs.pop();
      if (last !== '') {
        buffer = last;
      } else {
        buffer = '';
      }
      for (let i = 0; i < reqs.length; i++) {
        if (!c.handleData(reqs[i])) {
          socket.destroy();
          const idx = clients.findIndex((c2) => c2.id === c.id);
          clients.splice(idx, 1);
        }
      }
    }
  });

  socket.on('end', () => {
    console.log('client ended');
    const idx = clients.findIndex((c2) => c2.id === c.id);
    clients.splice(idx, 1);
    if (c.getName()) {
      for (const client of clients) {
        client.send(`* ${c.getName()} left the chat`);
      }
    }
  });
});

server.listen(8000, '0.0.0.0', () => {
  const addr = server.address();
  console.log(`listening at ${addr.address}:${addr.port}`);
});
