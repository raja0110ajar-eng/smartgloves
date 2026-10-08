export function cekDevice(req: Request) {
  return req.headers.get("authorization") === `Bearer ${process.env.DEVICE_TOKEN}`;
}