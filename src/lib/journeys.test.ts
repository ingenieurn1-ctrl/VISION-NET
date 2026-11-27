import { describe, expect, it } from "vitest";
import { userJourneys, type EventRow } from "./analytics";

const ev = (u: string, t: string, at: string, step = "", link: string | null = "l1"): EventRow =>
  ({ saas_id: "s1", link_id: link, event_type: t, external_user_id: u, step, created_at: at });
const links = [{ id: "l1", saas_id: "s1", channel: "whatsapp", name: "x" }];

describe("userJourneys", () => {
  it("keeps the furthest stage and the source channel per user", () => {
    const [a] = userJourneys(links, [ev("a", "signup", "2026-01-01"), ev("a", "onboarding_step", "2026-01-02", "profil"), ev("a", "subscription_activated", "2026-01-03")]);
    expect(a).toMatchObject({ userId: "a", stage: 3, channel: "whatsapp", firstAt: "2026-01-01", lastAt: "2026-01-03", cancelled: false });
  });
  it("marks a user cancelled when cancellation follows the last subscription", () => {
    const [a] = userJourneys(links, [ev("a", "subscription_activated", "2026-01-01"), ev("a", "subscription_cancelled", "2026-01-05")]);
    expect(a!.cancelled).toBe(true);
  });
  it("lists the most recently active user first", () => {
    const j = userJourneys(links, [ev("a", "signup", "2026-01-01"), ev("b", "signup", "2026-01-09")]);
    expect(j.map((x) => x.userId)).toEqual(["b", "a"]);
  });
});
