export async function offline(status: HTMLElement): Promise<void> {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) {
    status.textContent = "Offline saving is available in the published build.";
    return;
  }
  const unavailable = "Offline saving was unavailable. Keep this tab open or save a study.";
  const reload = document.createElement("button");
  reload.id = "offline-reload";
  reload.type = "button";
  reload.textContent = "Reload to use the offline copy";
  reload.hidden = true;
  reload.addEventListener("click", () => location.reload());
  status.insertAdjacentElement("afterend", reload);
  let generation = 0;
  async function inspect(worker: ServiceWorker | null): Promise<void> {
    if (!worker) return;
    const request = ++generation;
    const channel = new MessageChannel();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const saved = await new Promise<{
        type?: unknown;
        edition?: unknown;
        complete?: unknown;
      } | null>((resolve, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), 8000);
        channel.port1.onmessage = (event) => resolve(event.data);
        worker.postMessage({ type: "PNIGEUS_INSPECT" }, [channel.port2]);
      });
      // A reply from a superseded worker must not replace a newer inspection.
      if (request !== generation) return;
      const complete =
        saved?.type === "PNIGEUS_EDITION" &&
        saved.edition === __PNIGEUS_EDITION__ &&
        saved.complete === true;
      // An activated worker can answer while this document is still uncontrolled
      // (observed during cold Firefox navigation). Saved bytes alone are not readiness.
      const controlled = navigator.serviceWorker.controller === worker;
      reload.hidden = !complete || controlled;
      status.textContent = complete
        ? controlled
          ? "Ready offline · pump, shape and timing studies, Latin and Greek readings, source images and fonts saved."
          : "The edition is saved, but this page is not yet controlled for offline use. Save your reading, then reload this page to use the offline copy."
        : "This page’s offline edition is not ready. It will be checked when the worker changes; reload online if needed.";
    } catch {
      if (request === generation) status.textContent = unavailable;
    } finally {
      clearTimeout(timer);
      channel.port1.close();
    }
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    void inspect(navigator.serviceWorker.controller);
  });
  // Registration can wait behind an unfinished install. Check an existing
  // controller now, then re-check when the complete new edition claims this page.
  void inspect(navigator.serviceWorker.controller);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const registration = await Promise.race([
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`)
        .then(() => navigator.serviceWorker.ready),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), 10000);
      }),
    ]);
    await inspect(navigator.serviceWorker.controller ?? registration.active);
  } catch {
    if (generation === 0) status.textContent = unavailable;
  } finally {
    clearTimeout(timer);
  }
}
