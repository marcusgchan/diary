export async function POST(req: Request) {
  console.log("Hit webhook endpoint");
  console.log(await req.json());
  return Response.json({});
}
