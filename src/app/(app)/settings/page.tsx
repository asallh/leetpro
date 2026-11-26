import { getRequiredSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { chromeWebStoreUrl, envPill } from "@/lib/app-env";
import { DEV_EXTENSION_ID } from "@/lib/extension-package";
import { describeUserAgent } from "@/lib/user-agent";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Download, ExternalLink } from "lucide-react";
import { Suspense } from "react";
import Loading from "../loading";
import {
  DeleteAccountDialog,
  PasswordForm,
  ProfileForm,
  SignOutOthersButton,
} from "./settings-forms";

const PROVIDER_NAMES: Record<string, string> = {
  credential: "Email and password",
  google: "Google",
  github: "GitHub",
  discord: "Discord",
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SettingsContent />
    </Suspense>
  );
}

async function SettingsContent() {
  const session = await getRequiredSession();
  const userId = session.user.id;
  const now = new Date();

  const [user, accounts, sessions, attemptCount, problemCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true, image: true, createdAt: true },
    }),
    prisma.account.findMany({
      where: { userId },
      select: { providerId: true, createdAt: true, password: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.session.findMany({
      where: { userId, expiresAt: { gt: now } },
      select: { id: true, userAgent: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.attempt.count({ where: { userId } }),
    prisma.userProblem.count({ where: { userId } }),
  ]);

  // Same rule as the delete hook in auth.ts: a credential row with a password.
  // Only this boolean reaches the client, never the hash.
  const hasPassword = accounts.some((a) => a.providerId === "credential" && Boolean(a.password));
  // ENV=dev and ENV=test offer a zipped pre-release build; in production the
  // extension comes from the Chrome Web Store, and the section hides until
  // that link is set.
  const extensionEnv = envPill();
  const storeUrl = extensionEnv ? null : chromeWebStoreUrl();
  const initials =
    user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <div className="space-y-10">
      <PageHeader
        title="Settings"
        description="Your profile, how you sign in, and your account."
      />

      <div className="divide-y rounded-2xl border bg-card">
        <Section title="Profile" description="Your name shows in the account menu. Your email comes from how you signed up.">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.image ?? undefined} alt="" />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{user.email}</p>
              <p className="text-sm text-muted-foreground">Member since {format(user.createdAt, "MMMM d, yyyy")}</p>
            </div>
          </div>
          <ProfileForm name={user.name} />
        </Section>

        <Section
          title="Sign-in methods"
          description={
            hasPassword
              ? "You can sign in with any of these. Changing your password signs out your other devices."
              : "You sign in through these accounts, so there is no LeetPro password to change."
          }
        >
          <ul className="divide-y rounded-lg border">
            {accounts.map((a) => (
              <li key={a.providerId} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="font-medium">{PROVIDER_NAMES[a.providerId] ?? a.providerId}</span>
                <span className="text-muted-foreground">Linked {format(a.createdAt, "MMM d, yyyy")}</span>
              </li>
            ))}
          </ul>
          {hasPassword && <PasswordForm />}
        </Section>

        <Section
          title="Signed-in devices"
          description="Every browser and extension signed in to your account. Sign the others out if you lost a device or used a shared computer."
        >
          <ul className="divide-y rounded-lg border">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className="font-medium">{describeUserAgent(s.userAgent)}</span>
                <span className="text-muted-foreground">
                  {s.id === session.session.id
                    ? "This device"
                    : `Active ${formatDistanceToNowStrict(s.updatedAt, { addSuffix: true })}`}
                </span>
              </li>
            ))}
          </ul>
          <SignOutOthersButton disabled={sessions.length <= 1} />
        </Section>

        {extensionEnv && (
          <Section
            title="Chrome extension"
            description={`A ${extensionEnv === "test" ? "test" : "development"} build that talks to this site. It is only offered while the app runs with ENV=dev or ENV=test.`}
          >
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Download the zip and unzip it.</li>
              <li>
                Open <code className="rounded bg-secondary px-1 py-0.5 text-foreground">chrome://extensions</code> and
                turn on Developer mode.
              </li>
              <li>
                Choose Load unpacked and pick the <span className="text-foreground">leetpro-extension</span> folder.
              </li>
            </ol>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                href="/api/extension/download"
                download
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-lg")}
              >
                <Download />
                Download extension
              </a>
              <span className="text-sm text-muted-foreground">
                Extension ID <code className="text-foreground">{DEV_EXTENSION_ID}</code>
              </span>
            </div>
          </Section>
        )}

        {storeUrl && (
          <Section
            title="Chrome extension"
            description="Logs your LeetCode and NeetCode attempts as you solve them, with your recall shown on each problem."
          >
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-lg")}
            >
              <ExternalLink />
              Get it on the Chrome Web Store
            </a>
          </Section>
        )}
      </div>

      <section
        aria-labelledby="delete-account"
        className="grid gap-4 rounded-2xl border border-destructive/40 px-5 py-6 sm:px-6 md:grid-cols-[16rem_1fr] md:gap-10"
      >
        <div>
          <h2 id="delete-account" className="text-[1.25rem] font-semibold">
            Delete account
          </h2>
        </div>
        <div className="space-y-4">
          <p className="max-w-[60ch] text-muted-foreground">
            Permanently deletes your account, every attempt, note and solution you logged, your review schedule and your
            sign-in methods, and signs out every device. This cannot be undone.
          </p>
          <DeleteAccountDialog
            email={user.email}
            hasPassword={hasPassword}
            attemptCount={attemptCount}
            problemCount={problemCount}
          />
        </div>
      </section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 px-5 py-6 sm:px-6 md:grid-cols-[16rem_1fr] md:gap-10">
      <div>
        <h2 className="text-[1.25rem] font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}
