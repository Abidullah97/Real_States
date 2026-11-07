import test from "node:test";
import assert from "node:assert/strict";
import {registrationSchema,inquirySchema,submissionSchema} from "../src/lib/validation";

test("registration enforces strong passwords and normalizes the name",()=>{
 const valid=registrationSchema.safeParse({name:"  Ada Lovelace ",email:"ada@example.com",password:"StrongPassword123"});
 assert.equal(valid.success,true);
 if(valid.success)assert.equal(valid.data.name,"Ada Lovelace");
 assert.equal(registrationSchema.safeParse({name:"A",email:"bad",password:"weak"}).success,false);
});

test("inquiries reject too-short messages and accept a valid property inquiry",()=>{
 assert.equal(inquirySchema.safeParse({name:"Ada",email:"ada@example.com",message:"hello"}).success,false);
 assert.equal(inquirySchema.safeParse({name:"Ada",email:"ada@example.com",message:"I would like to arrange a viewing.",propertySlug:"garden-house"}).success,true);
});

test("seller submissions coerce numeric form values and enforce required details",()=>{
 const result=submissionSchema.safeParse({name:"Ada Lovelace",email:"ada@example.com",phone:"+923001234567",city:"Lahore",address:"Gulberg",propertyType:"House",listingType:"SALE",bedrooms:"3",area:"1800",areaUnit:"sq ft",price:"25000000",currency:"PKR",description:"A spacious family home with a garden and covered parking."});
 assert.equal(result.success,true);
 if(result.success)assert.equal(result.data.price,25_000_000);
});
