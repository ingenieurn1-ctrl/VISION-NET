import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { subDays, format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Check, Search, TrendingUp, UserRound } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { DateRangePicker } from "@/components/app/date-range-picker";
import { StatusBadge } from "@/components/app/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { userJourneys, type Journey } from "@/lib/analytics";
import { loadAnalytics } from "@/lib/analytics-data";
import { channelLabel } from "@/lib/channels";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/evolution")({
  head: () => ({
    meta: [
      { title: "Évolution · VisionNet" },
      { name: "description", content: "Suivi de l'évolution individuelle de chaque utilisateur — VisionNet" },
      { property: "og:title", content: "Évolution · VisionNet" },
      { property: "og:description", content: "Suivi de l'évolution individuelle de chaque utilisateur" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const STAGES = ["Clic", "Inscription", "Onboarding", "Abonné"] as const;
const EVENT_LABEL: Record<string, string> = {
  signup: "Inscription", onboarding_step: "Étape d'onboarding", subscription_activated: "Abonnement activé", subscription_cancelled: "Abonnement annulé",
};
const EVENT_TONE: Record<string, "primary" | "success" | "warning" | "danger" | "neutral"> = {
  signup: "primary", onboarding_step: "neutral", subscription_activated: "success", subscription_cancelled: "danger",
};

function stageBadge(j: Journey) {
  if (j.cancelled) return <StatusBadge tone="danger">Annulé</StatusBadge>;
  const tone = j.stage === 3 ? "success" : j.stage === 2 ? "warning" : "primary";
  return <StatusBadge tone={tone}>{STAGES[j.stage]}</StatusBadge>;
}

function Page() {
  const [range, setRange] = useState<DateRange>({ from: subDays(new Date(), 89), to: new Date() });
  const [saasId, setSaasId] = useState("all");
  const [stage, setStage] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const from = range.from ?? subDays(new Date(), 89); const to = range.to ?? from;
  const q = useQuery({ queryKey: ["analytics", from.toDateString(), to.toDateString()], queryFn: () => loadAnalytics(from, to) });
  const d = q.data;
  const saasName = useMemo(() => new Map(d?.saas.map((s) => [s.id, s.name])), [d]);
  const journeys = useMemo(() => (d ? userJourneys(d.links, d.events) : []), [d]);
  const list = journeys.filter((j) =>
    (saasId === "all" || j.saasId === saasId) &&
    (stage === "all" || (stage === "cancelled" ? j.cancelled : !j.cancelled && String(j.stage) === stage)) &&
    j.userId.toLowerCase().includes(search.trim().toLowerCase()));
  const keyOf = (j: Journey) => `${j.saasId}:${j.userId}`;
  const current = list.find((j) => keyOf(j) === selected) ?? null;
  useEffect(() => { if (!isMobile && !current && list[0]) setSelected(keyOf(list[0])); }, [isMobile, current, list]);

  const counts = [1, 2, 3].map((s) => list.filter((j) => !j.cancelled && j.stage === s).length);
  const cancelled = list.filter((j) => j.cancelled).length;

  if (!q.isLoading && !d?.saas.length) return (<><PageHeader title="Évolution" /><EmptyState icon={TrendingUp} title="Ajoutez d'abord un SaaS" /></>);

  return (
    <>
      <PageHeader title="Évolution" actions={<DateRangePicker value={range} onChange={setRange} />} />
      <p className="-mt-2 mb-5 max-w-2xl sm:-mt-3 sm:mb-6 text-sm text-muted-foreground">Suivez le parcours de chaque utilisateur, de l'inscription jusqu'à l'abonnement.</p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[["Inscrits", counts[0]], ["En onboarding", counts[1]], ["Abonnés", counts[2]], ["Annulés", cancelled]].map(([l, v]) => (
          <Card key={l} className="flex min-w-0 flex-col gap-1.5 p-4 sm:p-5">
            <span className="truncate text-xs text-muted-foreground sm:text-sm">{l}</span>
            {q.isLoading ? <Skeleton className="h-8 w-16" /> : <span className="text-xl font-semibold tabular-nums sm:text-2xl">{v}</span>}
          </Card>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="relative col-span-2 sm:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un utilisateur" aria-label="Rechercher un utilisateur" className="pl-9" />
        </div>
        <Select value={saasId} onValueChange={setSaasId}>
          <SelectTrigger aria-label="SaaS" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les SaaS</SelectItem>
            {d?.saas.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger aria-label="Étape" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les étapes</SelectItem>
            <SelectItem value="1">Inscription</SelectItem>
            <SelectItem value="2">Onboarding</SelectItem>
            <SelectItem value="3">Abonné</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="min-w-0 overflow-hidden p-0">
          {q.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            : !list.length ? <div className="p-2 sm:p-6"><EmptyState icon={UserRound} title="Aucun utilisateur sur cette période" /></div> : (
            <ul className="max-h-[36rem] divide-y overflow-y-auto">
              {list.map((j) => (
                <li key={keyOf(j)}>
                  <button type="button" onClick={() => setSelected(keyOf(j))}
                    className={cn("grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/60", selected === keyOf(j) && "bg-muted")}>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{j.userId}</div>
                      <div className="truncate text-xs text-muted-foreground">{saasName.get(j.saasId) ?? "SaaS"} · {j.channel ? channelLabel(j.channel) : "Direct"} · {formatDistanceToNow(new Date(j.lastAt), { locale: fr, addSuffix: true })}</div>
                    </div>
                    {stageBadge(j)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {isMobile ? (
          <Sheet open={!!current} onOpenChange={(o) => !o && setSelected(null)}>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
              <SheetHeader><SheetTitle className="truncate">{current?.userId}</SheetTitle></SheetHeader>
              {current ? <div className="px-4 pb-6"><Detail j={current} saas={saasName.get(current.saasId)} /></div> : null}
            </SheetContent>
          </Sheet>
        ) : (
          <Card className="min-w-0 p-6">
            {current ? (<>
              <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <h2 className="truncate text-lg font-semibold">{current.userId}</h2>{stageBadge(current)}
              </div>
              <Detail j={current} saas={saasName.get(current.saasId)} />
            </>) : <EmptyState icon={UserRound} title="Sélectionnez un utilisateur" />}
          </Card>
        )}
      </div>
    </>
  );
}

function Detail({ j, saas }: { j: Journey; saas: string | undefined }) {
  const days = Math.max(0, Math.round((new Date(j.lastAt).getTime() - new Date(j.firstAt).getTime()) / 86400000));
  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div><dt className="text-muted-foreground">SaaS</dt><dd className="truncate font-medium">{saas ?? "—"}</dd></div>
        <div><dt className="text-muted-foreground">Source</dt><dd className="truncate font-medium">{j.channel ? channelLabel(j.channel) : "Direct"}</dd></div>
        <div><dt className="text-muted-foreground">Événements</dt><dd className="font-medium tabular-nums">{j.events.length}</dd></div>
        <div><dt className="text-muted-foreground">Durée</dt><dd className="font-medium tabular-nums">{days} j</dd></div>
      </dl>

      <ol className="grid grid-cols-3 gap-2" aria-label="Progression">
        {STAGES.slice(1).map((label, i) => {
          const done = j.stage >= i + 1;
          return (
            <li key={label} className="min-w-0">
              <div className={cn("h-1.5 rounded-full", done ? (j.cancelled ? "bg-destructive" : "bg-primary") : "bg-muted")} />
              <div className={cn("mt-2 flex items-center gap-1 truncate text-xs", done ? "font-medium" : "text-muted-foreground")}>
                {done ? <Check className="size-3.5 shrink-0" /> : null}<span className="truncate">{label}</span>
              </div>
            </li>
          );
        })}
      </ol>

      <div>
        <h3 className="mb-4 text-sm font-medium">Chronologie</h3>
        <ol className="relative space-y-5 border-l pl-6">
          {j.events.map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute top-1.5 -left-[1.9rem] size-3 rounded-full border-2 border-background bg-primary" />
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{EVENT_LABEL[e.event_type] ?? e.event_type}{e.step ? <span className="font-normal text-muted-foreground"> · {e.step}</span> : null}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(e.created_at), "d MMM yyyy, HH:mm", { locale: fr })}</div>
                </div>
                <StatusBadge tone={EVENT_TONE[e.event_type] ?? "neutral"}>{EVENT_LABEL[e.event_type]?.split(" ")[0] ?? e.event_type}</StatusBadge>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
