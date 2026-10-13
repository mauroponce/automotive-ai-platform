export const runtime="nodejs"; export function GET(){return Response.json({status:"ok",service:"automotive-ai-platform",demoMode:process.env.APP_DEMO_MODE!=="false"});}
