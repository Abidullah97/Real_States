export async function sendTransactionalEmail(input:{to:string;subject:string;html:string}){
 const key=process.env.EMAIL_API_KEY,from=process.env.EMAIL_FROM;
 if(!key||!from){
  // Development without a provider: print the message (including any verification or reset link) so account flows can be completed locally.
  if(process.env.NODE_ENV!=="production"){console.info(`\n[email:dev] To: ${input.to}\n[email:dev] Subject: ${input.subject}\n[email:dev] ${input.html.replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g,"$2: $1").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()}\n`);return;}
  throw new Error("Email delivery is not configured.");
 }
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({...input,from})});
 if(!response.ok)throw new Error("Email provider rejected the message.");
}
