import {PrismaClient} from "../src/generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg";
import {demoSeeds} from "../src/lib/properties";
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL||"postgresql://invalid:invalid@127.0.0.1:1/estate_house?schema=public"})});
async function main(){
 for(const [index,item] of demoSeeds.entries()){
  const location={country:"Pakistan",city:item.city,locality:item.locality};
  const loc=await db.location.upsert({where:{id:`seed-${item.slug}`},create:{id:`seed-${item.slug}`,...location},update:location});
  const fields={title:item.title,description:item.description||"",listingType:item.listingType,propertyType:item.kind,price:String(item.price),currency:item.currency,area:String(item.area),areaUnit:item.unit,bedrooms:item.beds,bathrooms:item.baths,parking:item.parking||0,featured:!!item.featured,locationId:loc.id};
  const images=item.gallery.map((url,position)=>({url,alt:`Demo listing image ${position+1} for ${item.title}`,position}));
  const features=(item.features||[]).map(name=>({name}));
  await db.property.upsert({
   where:{slug:item.slug},
   create:{...fields,slug:item.slug,reference:item.reference||`EH-DEMO-${String(index+1).padStart(4,"0")}`,status:"PUBLISHED",publishedAt:new Date(Date.now()-index*86_400_000),images:{create:images},features:{create:features}},
   update:{...fields,images:{deleteMany:{},create:images},features:{deleteMany:{},create:features}},
  });
 }
 // Earlier seed versions created one location per city; remove only those seed rows that no listing uses any more.
 const removed=await db.location.deleteMany({where:{id:{startsWith:"seed-"},properties:{none:{}}}});
 console.log(`Seeded ${demoSeeds.length} clearly marked demonstration listings${removed.count?`; removed ${removed.count} unused seed locations`:""}.`);
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>db.$disconnect());
