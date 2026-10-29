// Hosting is opt-in. Local development keeps its loopback-only defaults.
export function getServerConfig(env = process.env) {
  const hosted = env.PC_LEASE_HOSTED === 'true';
  const port = Number(hosted ? env.PORT : (env.PC_LEASE_SERVER_PORT ?? 3001));
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid server port');
  const localOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'];
  if (!hosted) return { hosted, port, host: '127.0.0.1', origins: localOrigins, secureCookie: '' };
  let url;
  try { url = new URL(env.PC_LEASE_PUBLIC_ORIGIN); } catch { throw new Error('Set PC_LEASE_PUBLIC_ORIGIN to an HTTPS origin'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.origin !== env.PC_LEASE_PUBLIC_ORIGIN) throw new Error('Invalid public origin');
  return { hosted, port, host: '0.0.0.0', origins: [url.origin], secureCookie: '; Secure' };
}
