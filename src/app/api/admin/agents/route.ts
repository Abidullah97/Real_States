import { NextResponse } from "next/server";
import { logAction } from "@/lib/audit";
import { sendTransactionalEmail } from "@/lib/email";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { issueToken } from "@/lib/tokens";
import { createAgentSchema } from "@/lib/validation";

/**
 * Adds an agent: creates a verified account with no password and emails a one-time link to set one.
 * The administrator never sees or chooses the agent's password.
 */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  try {
    const parsed = createAgentSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check the agent details: name, email, phone and location are required." }, { status: 400 });
    const d = parsed.data;
    const email = d.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      return NextResponse.json({ error: "An account with this email already exists. Change its role to Agent under Users instead." }, { status: 409 });
    }
    const user = await prisma.user.create({
      data: {
        name: d.name,
        email,
        emailVerified: new Date(),
        role: "AGENT",
        agentProfile: {
          create: {
            phone: d.phone,
            location: d.location,
            bio: d.bio || null,
            experienceYears: d.experienceYears ?? null,
            specialization: d.specialization || null,
            status: "APPROVED",
            reviewedAt: new Date(),
            verifiedAt: d.verified ? new Date() : null,
          },
        },
      },
      include: { agentProfile: { select: { id: true } } },
    });
    await logAction(gate.principal!.id, "agent.create", "User", user.id, { email });

    let emailNote = "";
    try {
      const token = await issueToken(`reset:${email}`, 7 * 24 * 60 * 60_000);
      const link = new URL(`/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`, process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin);
      await sendTransactionalEmail({ to: email, subject: "Your Estate House agent account", html: `<p>Hello ${d.name.replace(/[<>&"]/g, "")},</p><p>An agent account has been created for you. Choose a password to sign in:</p><p><a href="${link}">Set your password</a></p><p>This link expires in 7 days.</p>` });
    } catch {
      emailNote = " The set-password email could not be sent; ask the agent to use “Forgot password”.";
    }
    return NextResponse.json({ message: `Agent account created for ${d.name}.${emailNote}`, id: user.agentProfile?.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Agent could not be created." }, { status: 503 });
  }
}
