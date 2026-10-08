import { Composition } from "remotion";
import { PricingExplainer, TOTAL_FRAMES } from "./PricingExplainer";

export const Root = () => (
  <Composition
    id="PricingExplainer"
    component={PricingExplainer}
    durationInFrames={TOTAL_FRAMES}
    fps={30}
    width={1280}
    height={720}
  />
);
