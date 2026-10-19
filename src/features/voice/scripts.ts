const base = import.meta.env.BASE_URL;

const pending = new Map<string, Promise<void>>();
export function loadScript(src: string): Promise<void> {
  const existing = pending.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${base}${src}`;
    script.dataset.cti = src;
    script.onload = () => resolve();
    script.onerror = () => {
      pending.delete(src);
      script.remove();
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });
  pending.set(src, promise);
  return promise;
}

export function loadSipScripts() {
  return loadScript("cti/config.js")
    .then(() => loadScript("cti/sip-libraries/sip-0.21.2.js"))
    .then(() => loadScript("cti/sip-libraries/sip-wrapper.js"));
}

export function loadFinesseScripts(configure: () => void, register: () => void) {
  return loadScript("cti/jQuery3.5.1.min.js")
    .then(() => loadScript("cti/config.js"))
    .then(() => {
      configure();
      return loadScript("cti/jabberwerx.js");
    })
    .then(() => loadScript("cti/wrapper.js"))
    .then(() => {
      register();
      return loadScript("cti/CTIJsLibrary.js");
    });
}

export interface CtiCommand {
  action: string;
  parameter?: Record<string, unknown>;
}

export function postSip(command: CtiCommand) {
  if (!window.postMessages) throw new Error("CX Voice is not connected");
  window.postMessages(command);
}

export function postFinesse(command: CtiCommand) {
  if (!window.executeCommands) throw new Error("Cisco is not connected");
  window.executeCommands(command);
}

declare global {
  interface Window {
    postMessages?: (command: CtiCommand) => void;
    executeCommands?: (command: CtiCommand) => void;
    sipConfig?: Record<string, unknown>;
    config?: Record<string, unknown>;
  }
}
