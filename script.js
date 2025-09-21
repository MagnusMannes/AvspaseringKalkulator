const form = document.getElementById("avspasering-form");
const arrivalInput = document.getElementById("arrival");
const departureInput = document.getElementById("departure");
const portionSelect = document.getElementById("portion");
const errorMessage = document.getElementById("error-message");
const resultSection = document.getElementById("result");
const resultRows = document.getElementById("result-rows");
const resultEmpty = document.getElementById("result-empty");
const selectedFraction = document.getElementById("selected-fraction");

const STORAGE_KEY = "avspaseringEntries";

let entries = loadEntries();

const dateTimeFormatter = new Intl.DateTimeFormat("no-NO", {
  dateStyle: "full",
  timeStyle: "short",
});

renderEntries();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const arrivalValue = arrivalInput.value;
  const departureValue = departureInput.value;

  if (!arrivalValue || !departureValue) {
    showError("Fyll inn både ankomst og avgang.");
    return;
  }

  const arrival = new Date(arrivalValue);
  const departure = new Date(departureValue);

  if (Number.isNaN(arrival.getTime()) || Number.isNaN(departure.getTime())) {
    showError("Ugyldig dato eller klokkeslett.");
    return;
  }

  if (departure <= arrival) {
    showError("Avgang må være etter ankomst.");
    return;
  }

  const fraction = parseFloat(portionSelect.value);
  const totalMilliseconds = departure.getTime() - arrival.getTime();
  const avspaseringMinutes = Math.ceil((totalMilliseconds * fraction) / 60000);

  if (avspaseringMinutes <= 0) {
    showError("Tidsintervallet er for kort til å beregne avspasering.");
    return;
  }

  const durationText = formatDuration(avspaseringMinutes);
  const completion = new Date(
    departure.getTime() + avspaseringMinutes * 60000
  );
  const fractionLabel =
    portionSelect.options[portionSelect.selectedIndex].textContent;

  const newEntry = {
    id: createId(),
    periodStart: arrival.toISOString(),
    periodEnd: departure.toISOString(),
    duration: durationText,
    completion: dateTimeFormatter.format(completion),
    fractionLabel,
    description: "",
  };

  entries.unshift(newEntry);
  saveEntries();
  renderEntries();

  errorMessage.textContent = "";
  form.reset();
});

function showError(message) {
  errorMessage.textContent = message;
}

function renderEntries() {
  resultRows.innerHTML = "";
  const hasEntries = entries.length > 0;

  resultSection.hidden = false;
  resultEmpty.hidden = hasEntries;

  if (!hasEntries) {
    selectedFraction.textContent = "";
    return;
  }

  entries.forEach((entry) => {
    const row = document.createElement("tr");
    row.dataset.id = entry.id;

    const arrivalCell = document.createElement("td");
    arrivalCell.dataset.label = "Ankomst";
    const arrivalText = formatStoredDate(entry.periodStart);
    arrivalCell.textContent = arrivalText || "Tidspunkt ikke lagret";

    const departureCell = document.createElement("td");
    departureCell.dataset.label = "Avgang";
    const departureText = formatStoredDate(entry.periodEnd);
    departureCell.textContent = departureText || "Tidspunkt ikke lagret";

    const durationCell = document.createElement("td");
    durationCell.textContent = entry.duration;
    durationCell.dataset.label = "Varighet avspasering";

    const completionCell = document.createElement("td");
    completionCell.textContent = entry.completion;
    completionCell.dataset.label = "Ferdig avspasert";

    const descriptionCell = document.createElement("td");
    descriptionCell.dataset.label = "Beskrivelse";
    const descriptionInput = document.createElement("input");
    descriptionInput.type = "text";
    descriptionInput.placeholder = "Beskriv avspaseringen";
    descriptionInput.value = entry.description || "";
    descriptionInput.classList.add("result__description-input");
    descriptionInput.addEventListener("input", () => {
      entry.description = descriptionInput.value;
      saveEntries();
    });
    descriptionCell.append(descriptionInput);

    const screenshotCell = document.createElement("td");
    screenshotCell.classList.add("result__screenshot");
    screenshotCell.dataset.label = "Skjermbilde";
    const screenshotButton = document.createElement("button");
    screenshotButton.type = "button";
    screenshotButton.classList.add("result__screenshot-button");
    screenshotButton.innerHTML =
      '<span aria-hidden="true">📸</span><span class="visually-hidden">Lagre skjermbilde</span>';
    screenshotButton.addEventListener("click", async () => {
      screenshotButton.disabled = true;
      screenshotButton.classList.add("is-loading");

      try {
        await captureEntryScreenshot(entry);
      } finally {
        screenshotButton.disabled = false;
        screenshotButton.classList.remove("is-loading");
      }
    });
    screenshotCell.append(screenshotButton);

    const actionsCell = document.createElement("td");
    actionsCell.classList.add("result__actions");
    actionsCell.dataset.label = "Fjern";
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.classList.add("result__remove-button");
    removeButton.setAttribute("aria-label", "Fjern rad");
    removeButton.textContent = "×";
    removeButton.addEventListener("click", () => {
      removeEntry(entry.id);
    });
    actionsCell.append(removeButton);

    row.append(
      arrivalCell,
      departureCell,
      durationCell,
      completionCell,
      descriptionCell,
      screenshotCell,
      actionsCell,
    );
    resultRows.append(row);
  });

  if (entries[0].fractionLabel) {
    selectedFraction.textContent = `Valgt andel: ${entries[0].fractionLabel}`;
  } else {
    selectedFraction.textContent = "";
  }
}

function formatStoredDate(value) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return dateTimeFormatter.format(parsed);
}

function removeEntry(id) {
  entries = entries.filter((entry) => entry.id !== id);
  saveEntries();
  renderEntries();
}

function saveEntries() {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    // Ignorer lagringsfeil, for eksempel når lagring er deaktivert.
  }
}

function loadEntries() {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => ({
        id: typeof entry.id === "string" ? entry.id : createId(),
        periodStart:
          typeof entry.periodStart === "string" ? entry.periodStart : "",
        periodEnd:
          typeof entry.periodEnd === "string" ? entry.periodEnd : "",
        duration: typeof entry.duration === "string" ? entry.duration : "",
        completion:
          typeof entry.completion === "string" ? entry.completion : "",
        fractionLabel:
          typeof entry.fractionLabel === "string" ? entry.fractionLabel : "",
        description:
          typeof entry.description === "string" ? entry.description : "",
      }))
      .filter((entry) => entry.duration && entry.completion);
  } catch (error) {
    return [];
  }
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];

  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "time" : "timer"}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? "minutt" : "minutter"}`);
  }

  if (parts.length === 0) {
    return "0 minutter";
  }

  return parts.join(" og ");
}

async function captureEntryScreenshot(entry) {
  if (typeof html2canvas !== "function") {
    window.alert(
      "Kunne ikke ta skjermbilde fordi støttebiblioteket ikke er tilgjengelig."
    );
    return;
  }

  const card = createScreenshotCard(entry);
  document.body.append(card);

  try {
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const canvas = await html2canvas(card, {
      backgroundColor: null,
      scale: Math.min(3, window.devicePixelRatio || 2),
    });

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = createScreenshotFilename(entry);
    link.click();
  } catch (error) {
    console.error("Kunne ikke generere skjermbilde", error);
    window.alert("Noe gikk galt under generering av skjermbilde.");
  } finally {
    card.remove();
  }
}

function createScreenshotCard(entry) {
  const card = document.createElement("article");
  card.className = "screenshot-card";

  const heading = document.createElement("h3");
  heading.className = "screenshot-card__title";
  heading.textContent = "Avspaseringsdetaljer";

  const fraction = document.createElement("p");
  fraction.className = "screenshot-card__fraction";
  fraction.textContent = entry.fractionLabel
    ? `Andel: ${entry.fractionLabel}`
    : "Andel ikke angitt";

  const details = document.createElement("dl");
  details.className = "screenshot-card__list";

  details.append(
    createScreenshotItem(
      "Ankomst",
      formatStoredDate(entry.periodStart) || "Tidspunkt ikke lagret"
    ),
    createScreenshotItem(
      "Avgang",
      formatStoredDate(entry.periodEnd) || "Tidspunkt ikke lagret"
    ),
    createScreenshotItem("Varighet", entry.duration || "Ukjent"),
    createScreenshotItem(
      "Ferdig avspasert",
      entry.completion || "Tidspunkt ikke lagret"
    )
  );

  const description = document.createElement("p");
  description.className = "screenshot-card__description";
  description.textContent = entry.description
    ? entry.description
    : "Ingen beskrivelse lagt til.";

  const timestamp = document.createElement("p");
  timestamp.className = "screenshot-card__timestamp";
  const formatter = new Intl.DateTimeFormat("no-NO", {
    dateStyle: "long",
    timeStyle: "short",
  });
  timestamp.textContent = `Generert ${formatter.format(new Date())}`;

  card.append(heading, fraction, details, description, timestamp);

  return card;
}

function createScreenshotItem(label, value) {
  const item = document.createElement("div");
  item.className = "screenshot-card__item";

  const term = document.createElement("dt");
  term.textContent = label;

  const detail = document.createElement("dd");
  detail.textContent = value;

  item.append(term, detail);

  return item;
}

function createScreenshotFilename(entry) {
  const fallbackDate = new Date().toISOString().split("T")[0];
  const storedDate =
    typeof entry.periodStart === "string" && entry.periodStart
      ? entry.periodStart.split("T")[0]
      : fallbackDate;

  const slugSource = entry.description && entry.description.trim().length > 0
    ? entry.description
    : entry.fractionLabel || "avspasering";

  const slug = slugSource
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = slug ? `-${slug}` : "";

  return `avspasering-${storedDate}${suffix}.png`;
}
