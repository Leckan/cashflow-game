"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { clientApi } from "@/lib/client-api";

const schema = z.object({
  displayName: z.string().trim().min(1).max(40),
  avatarId: z.string().min(1),
  email: z.string().optional(),
  password: z.string().optional(),
});

export default function ProfilePage() {
  const session = useSession();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: "Guest", avatarId: "tide", email: "", password: "" },
  });
  useEffect(() => {
    void clientApi<{ identity: { displayName: string; avatarId: string } }>("/api/me").then((body) => {
      form.setValue("displayName", body.identity.displayName);
      form.setValue("avatarId", body.identity.avatarId);
    });
  }, [form]);
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="display text-5xl">Player</h1>
      <p className="mt-3 leading-7 text-paper/80">
        Guest play needs no account. A local demo sign-in uses any email and the password <span className="text-paper">playlocal</span>. It does not check a real inbox.
      </p>
      <form
        className="mt-6 grid gap-3"
        onSubmit={form.handleSubmit(async (values) => {
          await clientApi("/api/me", { method: "POST", body: JSON.stringify({ displayName: values.displayName, avatarId: values.avatarId }) });
          if (values.email && values.password) {
            await signIn("credentials", { email: values.email, password: values.password, displayName: values.displayName, redirect: false });
          }
        })}
      >
        <input className="h-11 bg-paper px-3 text-ink" {...form.register("displayName")} />
        <select className="h-11 bg-paper px-3 text-ink" {...form.register("avatarId")}>
          {["tide", "cedar", "brass", "plum", "fern", "clay"].map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
        <input className="h-11 bg-paper px-3 text-ink" placeholder="Email for demo sign-in" {...form.register("email")} />
        <input className="h-11 bg-paper px-3 text-ink" placeholder="Password" type="password" {...form.register("password")} />
        <Button type="submit">Save</Button>
      </form>
      {session.data?.user && (
        <Button className="mt-4" variant="quiet" onClick={() => void signOut()}>
          Sign out
        </Button>
      )}
      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <a className="underline" href="/api/me/export">Export games</a>
        <button
          type="button"
          className="underline"
          onClick={() => void clientApi("/api/me", { method: "DELETE" })}
        >
          Delete this player’s saved games
        </button>
      </div>
    </main>
  );
}
