import { useEffect, useRef, useState } from "react";
import { useDeskSettings } from "@/core/agent-settings";
import { useCurrentUser } from "@/core/auth";
import { CallDock } from "./CallDock";
import { useCallStore } from "./callStore";
import { bindSessionEvents } from "./sessionBridge";
import { startCxVoice, startFinesse, stopVoice } from "./voiceSession";

/** Starts the voice stack selected in Agent Desk settings and shows the call dock. */
export function VoiceHost() {
  const settings = useDeskSettings();
  const userId = useCurrentUser()?.id;
  const cx = Boolean(settings?.cxVoice);
  const cisco = Boolean(settings?.cisco);
  const bosh = settings?.ciscoSettings.boshUrl ?? "";
  const domain = settings?.ciscoSettings.domain ?? "";
  const flavor = settings?.ciscoSettings.finesseFlavor ?? "UCCX";
  const remote = useRef<HTMLVideoElement>(null);
  const local = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState({ remote: false, local: false });
  useEffect(() => {
    const check = () => {
      const hasVideo = (element: HTMLVideoElement | null) => {
        const stream = element?.srcObject;
        return (
          stream instanceof MediaStream &&
          stream.getVideoTracks().some((track) => track.readyState === "live" && track.enabled)
        );
      };
      const next = { remote: hasVideo(remote.current), local: hasVideo(local.current) };
      setVisible((prev) => (prev.remote === next.remote && prev.local === next.local ? prev : next));
    };
    const timer = setInterval(check, 500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => bindSessionEvents(), []);

  useEffect(() => {
    if (!userId || import.meta.env.MODE === "mock") return;
    let disposed = false;
    const failed = (error: Error) => {
      if (!disposed) useCallStore.getState().patch({ registered: false, lastError: error.message });
    };
    if (cx) {
      void startCxVoice().catch(failed);
      return () => {
        disposed = true;
        stopVoice();
      };
    }
    if (cisco) {
      void startFinesse(bosh, domain, flavor).catch(failed);
      return () => {
        disposed = true;
        stopVoice();
      };
    }
    return undefined;
  }, [userId, cx, cisco, bosh, domain, flavor]);

  return (
    <>
      <video
        ref={remote}
        id="remoteVideo"
        autoPlay
        playsInline
        className={`fixed end-4 bottom-24 z-30 max-h-60 w-80 rounded-lg bg-black ${visible.remote ? "" : "hidden"}`}
      >
        <track kind="captions" />
      </video>
      <video
        ref={local}
        id="localVideo"
        autoPlay
        playsInline
        muted
        className={`fixed end-4 bottom-24 z-40 max-h-20 w-24 rounded-lg ${visible.local ? "" : "hidden"}`}
      >
        <track kind="captions" />
      </video>
      <CallDock />
    </>
  );
}
