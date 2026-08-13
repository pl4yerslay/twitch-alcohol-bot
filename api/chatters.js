export default async function handler(req, res) {
  return res.status(200).json({
    node_env: process.env.NODE_ENV,
    all_env_keys: Object.keys(process.env)
  });
}
