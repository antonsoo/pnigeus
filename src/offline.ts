interface Inspection {
  type?: string;
  edition?: string;
  complete?: boolean;
  verified?: number;
  total?: number;
  error?: string;
}

export async function offline(status: HTMLElement): Promise<void> {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) {
    status.textContent = "Offline saving is available in the published build.";
    return;
  }
  const actions = document.createElement("div");
  actions.className = "offline-actions";
  function button(id: string, label: string, hidden = false): HTMLButtonElement {
    const element = document.createElement("button");
    element.id = id;
    element.type = "button";
    element.textContent = label;
    element.hidden = hidden;
    actions.append(element);
    return element;
  }
  const check = button("offline-check", "Check offline copy");
  const repair = button("offline-repair", "Save offline copy again", true);
  const reload = button("offline-reload", "Reload to use the offline copy", true);
  const update = document.createElement("p");
  update.id = "offline-update";
  update.hidden = true;
  update.setAttribute("role", "status");
  status.after(actions, update);
  reload.addEventListener("click", () => location.reload());
  let registration: ServiceWorkerRegistration | null = null;
  let generation = 0;
  let busy = false;
  let refreshAgain = false;
  let verifiedReady = false;
  let scheduled: ReturnType<typeof setTimeout> | undefined;
  let releaseRequest: (() => void) | null = null;

  function worker(): ServiceWorker | null {
    return navigator.serviceWorker.controller ?? registration?.active ?? null;
  }
  function pending(): void {
    update.hidden = !registration?.waiting;
    if (!update.hidden)
      update.textContent =
        "A new edition is saved. This tab keeps its current edition. Save your readings, close all Pnigeus tabs, then reopen to use the new edition.";
  }
  function request(
    target: ServiceWorker,
    type: "PNIGEUS_INSPECT" | "PNIGEUS_REPAIR",
  ): Promise<Inspection> {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      let timer: ReturnType<typeof setTimeout>;
      const finish = () => {
        clearTimeout(timer);
        channel.port1.close();
        if (releaseRequest === reset) releaseRequest = null;
      };
      const reset = () => {
        clearTimeout(timer);
        timer = setTimeout(
          () => {
            finish();
            reject(
              new Error(
                "The offline worker stopped responding. Your work is unchanged; try again while online.",
              ),
            );
          },
          type === "PNIGEUS_REPAIR" ? 35000 : 10000,
        );
      };
      if (type === "PNIGEUS_REPAIR") releaseRequest = reset;
      reset();
      channel.port1.onmessage = (event: MessageEvent<Inspection>) => {
        finish();
        resolve(event.data);
      };
      target.postMessage({ type, edition: __PNIGEUS_EDITION__ }, [channel.port2]);
    });
  }
  async function inspect(restoring = false): Promise<void> {
    if (busy) return;
    const target = worker();
    if (!target) {
      status.textContent = "Saving the complete edition. Offline use is not available yet.";
      return;
    }
    clearTimeout(scheduled);
    refreshAgain = false;
    busy = true;
    verifiedReady = false;
    const turn = ++generation;
    check.disabled = repair.disabled = true;
    reload.hidden = true;
    status.textContent = restoring
      ? "Verifying saved files and restoring the missing or damaged files…"
      : "Checking every file in this page’s offline edition…";
    try {
      const saved = await request(target, restoring ? "PNIGEUS_REPAIR" : "PNIGEUS_INSPECT");
      if (
        turn !== generation ||
        (navigator.serviceWorker.controller && navigator.serviceWorker.controller !== target)
      )
        return;
      const matches = saved.type === "PNIGEUS_EDITION" && saved.edition === __PNIGEUS_EDITION__;
      const complete = matches && saved.complete === true;
      const controlled = navigator.serviceWorker.controller === target;
      repair.hidden = !matches || complete;
      reload.hidden = !complete || controlled;
      verifiedReady = complete && controlled;
      if (verifiedReady)
        status.textContent =
          "Ready offline · pump, shape and timing studies, Latin and Greek readings, source images and fonts verified.";
      else if (complete)
        status.textContent =
          "The edition is saved, but this page is not yet controlled for offline use. Save your reading, then reload this page to use the offline copy.";
      else if (!matches)
        status.textContent =
          "This tab and its worker belong to different editions. Save your reading, close all Pnigeus tabs, then reopen while online.";
      else
        status.textContent = `${saved.verified ?? 0} of ${saved.total ?? "the required"} files verified. The offline copy is incomplete or damaged. ${saved.error ?? "Use Save offline copy again while online; your experiment and explanation stay in place."}`;
    } catch (error) {
      if (turn === generation) {
        status.textContent =
          error instanceof Error
            ? error.message
            : "Offline verification was unavailable. Keep this tab open and save your reading.";
        repair.hidden = false;
      }
    } finally {
      if (turn === generation) {
        busy = false;
        check.disabled = false;
        repair.disabled = !navigator.onLine;
        pending();
        if (refreshAgain) {
          refreshAgain = false;
          refresh();
        }
      }
    }
  }
  function refresh(): void {
    if (busy) {
      refreshAgain = true;
      return;
    }
    clearTimeout(scheduled);
    verifiedReady = false;
    status.textContent = "Checking this page’s offline edition…";
    scheduled = setTimeout(() => {
      void inspect();
    }, 100);
  }
  check.addEventListener("click", () => {
    void inspect();
  });
  repair.addEventListener("click", () => {
    void inspect(true);
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    generation++;
    busy = false;
    refresh();
  });
  navigator.serviceWorker.addEventListener("message", (event: MessageEvent) => {
    const data = event.data;
    if (data?.edition !== __PNIGEUS_EDITION__) return;
    if (data.type === "PNIGEUS_PROGRESS") {
      releaseRequest?.();
      if (busy || !verifiedReady)
        status.textContent = `Saving offline copy: ${data.completed} of ${data.total} files verified${data.bytes ? `; receiving ${(data.received / 1024).toFixed(0)} of ${(data.bytes / 1024).toFixed(0)} KB` : ""}. Your experiment stays editable.`;
    } else if (data.type === "PNIGEUS_INVALIDATED" || data.type === "PNIGEUS_CHANGED") refresh();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });
  window.addEventListener("focus", refresh);
  window.addEventListener("online", refresh);
  window.addEventListener("offline", () => {
    repair.disabled = true;
    refresh();
  });
  void inspect();
  try {
    registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
    const watch = () => {
      const installing = registration?.installing;
      installing?.addEventListener("statechange", () => {
        pending();
        if (installing.state === "activated" || installing.state === "redundant") refresh();
      });
      pending();
    };
    registration.addEventListener("updatefound", watch);
    watch();
    if (registration.active) refresh();
  } catch {
    if (!verifiedReady)
      status.textContent =
        "Offline installation was unavailable. Keep this tab open or save a reading; retry by reloading online after saving your work.";
  }
}
