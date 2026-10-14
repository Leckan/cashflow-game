import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { readProfile, writeProfile } from "@/server/store";

export interface Identity {
  id: string;
  displayName: string;
  avatarId: string;
  authenticated: boolean;
}

export async function getIdentity(): Promise<Identity> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const id = session.user.email.toLowerCase();
      const saved = await readProfile(id);
      return {
        id,
        displayName: saved?.displayName || session.user.name || "Player",
        avatarId: saved?.avatarId || "brass",
        authenticated: true,
      };
    }
  } catch {
    // Guest play still works if the auth adapter is unavailable.
  }
  const jar = await cookies();
  let id = jar.get("wq_gid")?.value;
  if (!id) {
    id = crypto.randomUUID();
    jar.set("wq_gid", id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 400 });
  }
  const saved = await readProfile(id);
  return {
    id,
    displayName: saved?.displayName ?? "Guest",
    avatarId: saved?.avatarId ?? "tide",
    authenticated: false,
  };
}

export async function saveIdentity(identity: Identity, displayName: string, avatarId: string) {
  await writeProfile({ id: identity.id, displayName, avatarId, email: identity.authenticated ? identity.id : null });
}
