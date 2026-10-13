import { PrismaClient } from "@prisma/client";
import { AUTOMOTIVE_SHOWROOM_V1 } from "../lib/prompt";
const prisma = new PrismaClient();
async function main() { const template = await prisma.promptTemplate.upsert({ where:{name:"automotive_showroom_v1"}, update:{}, create:{name:"automotive_showroom_v1",description:"Strict used-vehicle fidelity prompt"} }); await prisma.promptVersion.upsert({where:{promptTemplateId_version:{promptTemplateId:template.id,version:1}},update:{},create:{promptTemplateId:template.id,version:1,promptText:AUTOMOTIVE_SHOWROOM_V1}}); for(const modelIdentifier of ["gpt-image-2.5-sunburst","gpt-image-2.5-flare","gpt-image-2"]) await prisma.modelRegistry.upsert({where:{modelIdentifier},update:{},create:{modelIdentifier}}); }
main().finally(()=>prisma.$disconnect());
