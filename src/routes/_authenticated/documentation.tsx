import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { CopyField } from "@/components/app/copy-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/documentation")({
  head: () => ({
    meta: [
      { title: "Documentation · VisionNet" },
      { name: "description", content: "Guide d'intégration de VisionNet : liens de suivi et envoi d'événements." },
      { property: "og:title", content: "Documentation · VisionNet" },
      { property: "og:description", content: "Guide d'intégration de VisionNet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Code({ children }: { children: string }) {
  return <pre className="max-w-full overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed sm:p-4 sm:text-xs">{children}</pre>;
}

function CopyBlock({ children, label = "Copier" }: { children: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="outline" onClick={async () => {
          await navigator.clipboard.writeText(children); setCopied(true); toast.success("Copié"); setTimeout(() => setCopied(false), 1500);
        }}>{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{label}</Button>
      </div>
      <Code>{children}</Code>
    </div>
  );
}

const EVENTS = [
  ["signup", "Le visiteur vient de créer son compte sur votre SaaS. À envoyer une seule fois par utilisateur."],
  ["onboarding_step", "Une étape d'onboarding est franchie. Renseignez step (ex. « profil_complete ») pour distinguer les étapes."],
  ["subscription_activated", "L'utilisateur active un abonnement payant."],
  ["subscription_cancelled", "L'utilisateur résilie son abonnement."],
] as const;

const ERRORS = [
  ["201", "Événement enregistré. linked: true si le ref_code correspond à un lien de ce SaaS."],
  ["200 duplicate: true", "Même type + même utilisateur + même step déjà reçu : ignoré sans erreur."],
  ["401 missing_api_key", "En-tête x-api-key absent."],
  ["401 invalid_api_key", "Clé inconnue (SaaS supprimé ou clé régénérée)."],
  ["401 missing_signature", "En-tête x-signature absent."],
  ["401 invalid_signature", "Signature calculée avec un autre secret ou sur un autre corps que celui envoyé."],
  ["401 stale_timestamp", "timestamp à plus de 5 minutes de l'heure réelle (horloge du serveur décalée ou valeur fixe)."],
  ["400 invalid_payload", "JSON invalide, event_type inconnu ou champ requis manquant (voir details)."],
  ["413 payload_too_large", "Corps supérieur à 32 000 caractères."],
  ["429 rate_limited", "Plus de 120 requêtes par minute pour ce SaaS."],
  ["500 storage_error", "Erreur d'enregistrement côté VisionNet : réessayez plus tard."],
] as const;

function Page() {
  const [origin, setOrigin] = useState("https://votre-domaine");
  useEffect(() => setOrigin(window.location.origin), []);
  const endpoint = `${origin}/api/public/ingest-event`;

  const capture = `// À exécuter sur TOUTES les pages publiques de votre SaaS (au minimum la page d'arrivée)
const ref = new URLSearchParams(window.location.search).get("vn_ref");
if (ref && /^[A-Za-z0-9_-]{4,16}$/.test(ref)) {
  document.cookie = \`vn_ref=\${ref}; path=/; max-age=\${60 * 60 * 24 * 30}; SameSite=Lax\`;
}`;

  const node = `// Fichier serveur, ex. lib/visionnet.js (Node 18+)
import crypto from "node:crypto";

export async function sendVisionNetEvent({ eventType, userId, refCode, step, metadata }) {
  const body = JSON.stringify({
    event_type: eventType,            // "signup" | "onboarding_step" | "subscription_activated" | "subscription_cancelled"
    external_user_id: String(userId), // id de l'utilisateur dans VOTRE base
    ref_code: refCode ?? null,        // valeur du cookie vn_ref, ou null
    step: step ?? null,
    timestamp: Date.now(),            // toujours l'heure actuelle
    metadata: metadata ?? {},
  });

  const signature = crypto
    .createHmac("sha256", process.env.VN_WEBHOOK_SECRET)
    .update(body)                     // exactement la chaîne envoyée ci-dessous
    .digest("hex");

  try {
    const res = await fetch("${endpoint}", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.VN_API_KEY,
        "x-signature": \`sha256=\${signature}\`,
      },
      body,
    });
    if (!res.ok) console.error("VisionNet", res.status, await res.text());
  } catch (e) {
    console.error("VisionNet injoignable", e); // ne jamais bloquer l'inscription
  }
}

// Dans votre route d'inscription, APRÈS la création du compte :
// await sendVisionNetEvent({ eventType: "signup", userId: user.id, refCode: req.cookies.vn_ref });`;

  const python = `import hmac, hashlib, json, time, os, requests

def send_visionnet_event(event_type, user_id, ref_code=None, step=None, metadata=None):
    body = json.dumps({
        "event_type": event_type,
        "external_user_id": str(user_id),
        "ref_code": ref_code,
        "step": step,
        "timestamp": int(time.time() * 1000),
        "metadata": metadata or {},
    })
    sig = hmac.new(os.environ["VN_WEBHOOK_SECRET"].encode(), body.encode(), hashlib.sha256).hexdigest()
    try:
        r = requests.post("${endpoint}", data=body, timeout=5, headers={
            "content-type": "application/json",
            "x-api-key": os.environ["VN_API_KEY"],
            "x-signature": f"sha256={sig}",
        })
        if r.status_code >= 300:
            print("VisionNet", r.status_code, r.text)
    except Exception as e:
        print("VisionNet injoignable", e)`;

  const curl = `# Test de connexion depuis un terminal (remplacez les deux valeurs)
export VN_API_KEY="vn_live_..."
export VN_WEBHOOK_SECRET="..."

BODY='{"event_type":"signup","external_user_id":"test_'$(date +%s)'","timestamp":'$(date +%s000)'}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$VN_WEBHOOK_SECRET" | sed 's/^.* //')
curl -i -X POST "${endpoint}" \\
  -H "content-type: application/json" \\
  -H "x-api-key: $VN_API_KEY" \\
  -H "x-signature: sha256=$SIG" \\
  -d "$BODY"
# Réponse attendue : HTTP 201 {"ok":true,"duplicate":false,"linked":false}`;

  const prompt = `Tu dois connecter mon SaaS à VisionNet, un outil qui suit mes liens d'affiliation. Implémente exactement ce qui suit, sans rien inventer.

CONTEXTE
- Les visiteurs arrivent sur mon site via un lien VisionNet qui ajoute ?vn_ref=CODE à l'URL (CODE = 4 à 16 caractères parmi A-Z a-z 0-9 _ -).
- Mon serveur doit envoyer à VisionNet un événement quand un utilisateur s'inscrit, franchit une étape d'onboarding, active ou résilie un abonnement.

1. CAPTURE DU CODE (côté navigateur, sur toutes les pages publiques)
- Lire le paramètre vn_ref dans l'URL. S'il correspond à /^[A-Za-z0-9_-]{4,16}$/, l'enregistrer dans un cookie "vn_ref" (path=/, max-age=2592000, SameSite=Lax).
- Ne pas écraser un cookie existant par une valeur vide.
- Si l'inscription est faite via OAuth (Google, etc.), le cookie doit survivre à la redirection : lire le cookie côté serveur au moment où le compte est créé.

2. SECRETS (côté serveur uniquement, jamais dans le code navigateur ni dans le dépôt)
- VN_API_KEY : clé d'API donnée par VisionNet (commence par vn_live_).
- VN_WEBHOOK_SECRET : secret de signature donné par VisionNet.

3. FONCTION D'ENVOI (côté serveur)
- Requête : POST ${endpoint}
- En-têtes : content-type: application/json ; x-api-key: <VN_API_KEY> ; x-signature: sha256=<signature>
- Corps JSON :
  - event_type (requis) : "signup" | "onboarding_step" | "subscription_activated" | "subscription_cancelled"
  - external_user_id (requis) : identifiant de l'utilisateur dans ma base, en texte, 200 caractères max, toujours le même pour un utilisateur
  - timestamp (requis) : Date.now() au moment de l'envoi (millisecondes). Rejeté s'il s'écarte de plus de 5 minutes.
  - ref_code (optionnel) : valeur du cookie vn_ref, ou null
  - step (optionnel) : nom de l'étape, 100 caractères max, pour onboarding_step
  - metadata (optionnel) : objet JSON libre (ex. { "plan": "pro" })
- Signature : HMAC-SHA256 en hexadécimal minuscule, calculé avec VN_WEBHOOK_SECRET sur la chaîne JSON EXACTE envoyée dans le corps. Sérialiser une seule fois, signer cette chaîne, envoyer cette même chaîne. Ne pas re-sérialiser.
- Taille max du corps : 32 000 caractères. Limite : 120 requêtes/minute.
- Délai d'attente 5 secondes. En cas d'erreur, journaliser le code HTTP et le corps de réponse, mais ne JAMAIS bloquer ni annuler l'action de l'utilisateur.

4. OÙ APPELER LA FONCTION
- "signup" : juste après la création réussie du compte (email ET OAuth), avec ref_code = cookie vn_ref.
- "onboarding_step" : à chaque étape franchie, avec step = nom de l'étape.
- "subscription_activated" / "subscription_cancelled" : dans le webhook de paiement (ex. Stripe checkout.session.completed / customer.subscription.deleted), avec external_user_id = le même id que pour signup. Stocker vn_ref sur le profil utilisateur à l'inscription pour pouvoir le renvoyer ici.

5. RÉPONSES
- 201 : enregistré. 200 avec duplicate:true : déjà reçu (même type + utilisateur + step), c'est normal.
- 401 invalid_signature : la signature n'est pas calculée sur le corps exact ou le secret est faux.
- 401 stale_timestamp : timestamp pas à l'heure actuelle.
- 400 invalid_payload : champ manquant ou event_type invalide.
- 429 : trop de requêtes, réessayer plus tard.

6. TEST
- Ajoute un moyen de tester (script ou route d'administration) qui envoie un "signup" avec external_user_id "test_<horodatage>" et affiche la réponse. Le résultat attendu est HTTP 201.`;

  return (
    <>
      <PageHeader title="Documentation" />
      <div className="grid max-w-4xl grid-cols-1 gap-4 sm:gap-6 [&>*]:min-w-0 [&_[data-slot=h]]:p-4 [&_[data-slot=h]]:sm:p-6 [&_[data-slot=c]]:px-4 [&_[data-slot=c]]:pb-4 [&_[data-slot=c]]:sm:px-6 [&_[data-slot=c]]:sm:pb-6">
        <Card className="border-primary/40">
          <CardHeader data-slot="h">
            <CardTitle>Pourquoi je ne vois que des clics ?</CardTitle>
          </CardHeader>
          <CardContent data-slot="c" className="space-y-2 text-sm">
            <p>VisionNet enregistre seul les <b>clics</b>, car le lien passe par VisionNet avant d'aller vers votre SaaS.</p>
            <p>Les <b>inscriptions et abonnements</b> se passent sur votre SaaS : VisionNet ne peut pas les voir. Ils n'apparaissent que si <b>le serveur de votre SaaS envoie un événement</b> à VisionNet (étapes 2 à 4 ci-dessous). Sans cette connexion, vous n'aurez jamais que des clics.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader data-slot="h">
            <CardTitle>1. Créer le SaaS et ses liens</CardTitle>
          </CardHeader>
          <CardContent data-slot="c" className="text-sm">
            <ol className="list-decimal space-y-2 pl-5">
              <li>Page <b>SaaS</b> : ajoutez votre SaaS avec son URL. Copiez la <b>clé d'API</b> et le <b>secret de signature</b> : ils ne sont affichés qu'une fois. Perdus ? Régénérez-les (les anciens cessent de fonctionner).</li>
              <li>Page <b>Affiliation</b> : créez un lien. Il ressemble à <code className="font-mono break-all">{origin}/r/CODE</code>. Un clic est enregistré puis le visiteur est redirigé vers l'URL de votre SaaS avec <code className="font-mono break-all">?vn_ref=CODE</code>.</li>
              <li>Mettez la clé et le secret dans les variables d'environnement <b>du serveur</b> de votre SaaS : <code className="font-mono">VN_API_KEY</code> et <code className="font-mono">VN_WEBHOOK_SECRET</code>. Jamais dans le code du navigateur.</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader data-slot="h">
            <CardTitle>2. Garder le code du lien</CardTitle>
            <CardDescription>Sans ce code, l'inscription est comptée mais pas reliée au lien.</CardDescription>
          </CardHeader>
          <CardContent data-slot="c" className="space-y-3 text-sm">
            <Code>{capture}</Code>
            <p className="text-muted-foreground">Conseil : à l'inscription, enregistrez aussi <code className="font-mono">vn_ref</code> sur le profil de l'utilisateur, pour le renvoyer plus tard avec l'abonnement.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader data-slot="h">
            <CardTitle>3. Envoyer les événements depuis votre serveur</CardTitle>
            <CardDescription>Requête POST en JSON, signée en HMAC-SHA256 avec votre secret.</CardDescription>
          </CardHeader>
          <CardContent data-slot="c" className="space-y-4">
            <CopyField label="Point d'entrée" value={endpoint} />
            <Tabs defaultValue="node">
              <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
                <TabsTrigger value="node">Node.js</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
                <TabsTrigger value="curl">Test cURL</TabsTrigger>
              </TabsList>
              <TabsContent value="node" className="min-w-0"><Code>{node}</Code></TabsContent>
              <TabsContent value="python" className="min-w-0"><Code>{python}</Code></TabsContent>
              <TabsContent value="curl" className="min-w-0"><Code>{curl}</Code></TabsContent>
            </Tabs>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Signez la chaîne JSON <b>exacte</b> que vous envoyez : sérialisez une fois, signez, envoyez la même chaîne.</li>
              <li><code className="font-mono">timestamp</code> = l'heure actuelle ; plus de 5 minutes d'écart et l'événement est refusé.</li>
              <li>Le navigateur ne doit jamais envoyer ces événements : le secret serait visible par tous.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader data-slot="h">
            <CardTitle>4. Quand envoyer quoi</CardTitle>
          </CardHeader>
          <CardContent data-slot="c" className="space-y-4 text-sm">
            <div className="divide-y rounded-md border">
              {EVENTS.map(([k, v]) => (
                <div key={k} className="grid gap-1 p-3 sm:grid-cols-[220px_1fr]">
                  <code className="font-mono text-xs font-medium break-words">{k}</code>
                  <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
            </div>
            <ul className="space-y-1.5">
              <li><code className="font-mono">event_type</code> — requis.</li>
              <li><code className="font-mono">external_user_id</code> — requis, l'id de l'utilisateur chez vous (200 car. max), le même pour tous ses événements.</li>
              <li><code className="font-mono">timestamp</code> — requis, millisecondes, secondes ou date ISO.</li>
              <li><code className="font-mono">ref_code</code> — optionnel, la valeur de <code className="font-mono">vn_ref</code>. Doit appartenir à un lien de ce SaaS.</li>
              <li><code className="font-mono">step</code> — optionnel, 100 car. max.</li>
              <li><code className="font-mono">metadata</code> — optionnel, objet libre.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader data-slot="h">
            <CardTitle>5. Vérifier que ça marche</CardTitle>
          </CardHeader>
          <CardContent data-slot="c" className="text-sm">
            <ol className="list-decimal space-y-2 pl-5">
              <li>Lancez le test cURL de l'étape 3 : vous devez obtenir <b>201</b>. La page <b>SaaS</b> affiche alors la date du dernier événement reçu.</li>
              <li>Test complet : ouvrez votre lien d'affiliation en navigation privée, inscrivez-vous sur votre SaaS, puis regardez <b>Évolution</b> : l'utilisateur doit apparaître relié au bon canal.</li>
              <li>Si l'inscription apparaît en « Direct », le code <code className="font-mono">vn_ref</code> n'a pas été gardé ou pas envoyé (étape 2).</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader data-slot="h"><CardTitle>Réponses et erreurs</CardTitle></CardHeader>
          <CardContent data-slot="c">
            <div className="divide-y rounded-md border text-sm">
              {ERRORS.map(([k, v]) => (
                <div key={k} className="grid gap-1 p-3 sm:grid-cols-[minmax(0,220px)_1fr]">
                  <code className="font-mono text-xs font-medium break-words">{k}</code>
                  <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader data-slot="h">
            <CardTitle>Prompt pour votre agent IA</CardTitle>
            <CardDescription>Copiez-le dans l'agent qui code votre SaaS (Lovable, Cursor, Claude…). Il contient toutes les règles exactes.</CardDescription>
          </CardHeader>
          <CardContent data-slot="c"><CopyBlock label="Copier le prompt">{prompt}</CopyBlock></CardContent>
        </Card>
      </div>
    </>
  );
}
