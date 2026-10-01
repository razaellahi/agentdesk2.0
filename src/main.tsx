import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/core/theme/index.css";
import { bootstrap } from "@/app/bootstrap";
import { App } from "@/app/App";
import { StartupError } from "@/app/pages/StartupError";
import { StartupSplash } from "@/app/pages/StartupSplash";

const root = createRoot(document.getElementById("root")!);

async function enableMocks() {
  // `pnpm mock`: offline backend (MSW). Never part of production builds.
  if (import.meta.env.MODE !== "mock") return;
  const { worker } = await import("@/test/msw/browser");
  await worker.start({
    onUnhandledRequest: "bypass",
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
}

async function start() {
  root.render(<StartupSplash />);
  await enableMocks();
  try {
    const context = await bootstrap();
    root.render(
      <StrictMode>
        <App context={context} />
      </StrictMode>,
    );
  } catch (error) {
    root.render(<StartupError error={error} onRetry={start} />);
  }
}

void start();
