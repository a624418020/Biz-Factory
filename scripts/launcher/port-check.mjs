import net from 'node:net';

export const isPortOpen = (port, host = '127.0.0.1') =>
  new Promise((resolve) => {
    const socket = new net.Socket();

    const finish = (value) => {
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(1000);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });

export const waitForPort = async (port, { host = '127.0.0.1', timeout = 30000, interval = 400 } = {}) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortOpen(port, host)) {
      return true;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return false;
};
