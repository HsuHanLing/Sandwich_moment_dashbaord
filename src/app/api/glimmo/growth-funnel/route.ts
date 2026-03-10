import { NextResponse } from "next/server";
import { glimmoBigquery } from "@/lib/glimmo-bigquery";
import { getGlimmoOnboardingFunnelQuery, getGlimmoFeatureAdoptionQuery } from "@/lib/glimmo-queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);

  try {
    const [[obRows], [faRows]] = await Promise.all([
      glimmoBigquery.query({ query: getGlimmoOnboardingFunnelQuery(days) }),
      glimmoBigquery.query({ query: getGlimmoFeatureAdoptionQuery(days) }),
    ]);

    const ob = (obRows as Record<string, unknown>[])[0] || {};
    const fa = (faRows as Record<string, unknown>[])[0] || {};
    const n = (v: unknown) => Number(v ?? 0);

    const onboarding = [
      { step: "first_open", label: "First Open", users: n(ob.first_open) },
      { step: "onboarding_personalize", label: "Personalize", users: n(ob.onboarding_personalize) },
      { step: "onboarding_notification", label: "Notification Step", users: n(ob.onboarding_notification) },
      { step: "homepage_view", label: "Homepage View", users: n(ob.homepage_view) },
      { step: "first_post", label: "First Entry", users: n(ob.first_post) },
    ];

    const featureAdoption = [
      { step: "writers", label: "Journal Writers", users: n(fa.writers) },
      { step: "ai_companion", label: "AI Companion", users: n(fa.ai_companion_users) },
      { step: "collection", label: "Collection", users: n(fa.collection_users) },
      { step: "insight", label: "Emotion Insight", users: n(fa.insight_users) },
      { step: "subscription", label: "Subscription View", users: n(fa.subscription_viewers) },
    ];

    return NextResponse.json({ onboarding, featureAdoption });
  } catch (error) {
    console.error("Glimmo growth-funnel error:", error);
    return NextResponse.json({ onboarding: [], featureAdoption: [] }, { status: 500 });
  }
}
