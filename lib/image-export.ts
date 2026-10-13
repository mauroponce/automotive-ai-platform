import sharp from "sharp";
export async function marketplaceSquare(master:Buffer){return sharp(master).rotate().resize(1200,1200,{fit:"contain",background:{r:255,g:255,b:255,alpha:1}}).withIccProfile("srgb").jpeg({quality:90,mozjpeg:true}).toBuffer();}
