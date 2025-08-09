export default async function handler(req, res) {
  const mod = await import(new URL('../../index.js', import.meta.url).href);
  return mod.default(req, res);
}


