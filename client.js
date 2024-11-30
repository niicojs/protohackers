import { Socket } from 'net';

const message = '{"method": "isPrime", "number": 2}\n';

const client = new Socket();
client.connect(8000, 'localhost', () => {
  client.write(message);
});
client.on('data', (data) => {
  console.log('response', data.toString());
  client.destroy();
});
