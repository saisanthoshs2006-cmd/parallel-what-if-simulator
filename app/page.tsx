import { Workspace } from "@/components/Workspace";
import { searchParamsToScenario } from "@/lib/simulation/scenario-url";

/**
 * Reads the scenario from the URL on the server so a shared link renders the correct state in
 * the very first paint (no baseline flash). This makes the route dynamic rather than static.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initial = searchParamsToScenario(params);
  const showIntro = !["conversion", "view", "canopy", "split", "name"].some((key) => params[key] !== undefined);
  return <Workspace initial={initial} showIntro={showIntro} />;
}
