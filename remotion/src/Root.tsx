import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { FeatureVideo } from "./FeatureVideo";
import { AIDetailVideo } from "./AIDetailVideo";

export const RemotionRoot = () => (
  <>
    <Composition id="main" component={MainVideo} durationInFrames={720} fps={30} width={1920} height={1080} />
    <Composition id="ai-detail" component={AIDetailVideo} durationInFrames={570} fps={30} width={1920} height={1080} />
    <Composition id="jobs" component={FeatureVideo} durationInFrames={300} fps={30} width={1920} height={1080}
      defaultProps={{ feature: "jobs" }} />
    <Composition id="candidates" component={FeatureVideo} durationInFrames={300} fps={30} width={1920} height={1080}
      defaultProps={{ feature: "candidates" }} />
    <Composition id="interviews" component={FeatureVideo} durationInFrames={300} fps={30} width={1920} height={1080}
      defaultProps={{ feature: "interviews" }} />
    <Composition id="offers" component={FeatureVideo} durationInFrames={300} fps={30} width={1920} height={1080}
      defaultProps={{ feature: "offers" }} />
    <Composition id="pipeline" component={FeatureVideo} durationInFrames={300} fps={30} width={1920} height={1080}
      defaultProps={{ feature: "pipeline" }} />
    <Composition id="ai" component={FeatureVideo} durationInFrames={300} fps={30} width={1920} height={1080}
      defaultProps={{ feature: "ai" }} />
    <Composition id="reports" component={FeatureVideo} durationInFrames={300} fps={30} width={1920} height={1080}
      defaultProps={{ feature: "reports" }} />
    <Composition id="hiring" component={FeatureVideo} durationInFrames={300} fps={30} width={1920} height={1080}
      defaultProps={{ feature: "hiring" }} />
    <Composition id="share" component={FeatureVideo} durationInFrames={300} fps={30} width={1920} height={1080}
      defaultProps={{ feature: "share" }} />
    <Composition id="settings" component={FeatureVideo} durationInFrames={300} fps={30} width={1920} height={1080}
      defaultProps={{ feature: "settings" }} />
  </>
);
