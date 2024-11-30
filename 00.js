import { createServer } from 'net';

const server = createServer();

server.on('connection', (socket) => {
  console.log('new client', socket.remoteAddress);

  socket.on('data', (data) => {
    console.log('got data', data.length);
    socket.write(data);
  });

  // socket.on('close', () => {
  //   console.log('client disconnected');
  // })

  socket.on('end', () => {
    console.log('client ended');
  });
});

server.listen(8000, '0.0.0.0', () => {
  const addr = server.address();
  console.log(`listening at ${addr.address}:${addr.port}`);
});
