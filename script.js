const form = document.getElementById("avspasering-form");
const arrivalInput = document.getElementById("arrival");
const departureInput = document.getElementById("departure");
const portionSelect = document.getElementById("portion");
const errorMessage = document.getElementById("error-message");
const resultSection = document.getElementById("result");
const resultsBody = document.getElementById("result-rows");

const STORAGE_KEY = "avspaseringEntries";
const DEFAULT_PORTION = "0.3333333333";

let entries = [];

const dateTimeFormatter = new Intl.DateTimeFormat("no-NO", {
  dateStyle: "full",
  timeStyle: "short",
});

portionSelect.value = DEFAULT_PORTION;

loadEntries();

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

  const completion = new Date(arrival.getTime() + avspaseringMinutes * 60000);

  const newEntry = {
    id: generateEntryId(),
    durationMinutes: avspaseringMinutes,
    completionISO: completion.toISOString(),
    fractionLabel: portionSelect.options[portionSelect.selectedIndex].text,
    description: "",
  };

  entries = [newEntry, ...entries];
  persistEntries();
  renderEntries();
  clearError();

  form.reset();
  portionSelect.value = DEFAULT_PORTION;
});

resultsBody.addEventListener("click", (event) => {
  const button = event.target.closest(".result__remove-button");

  if (!button) {
    return;
  }

  const row = button.closest("tr");

  if (!row) {
    return;
  }

  const { entryId } = row.dataset;

  entries = entries.filter((entry) => entry.id !== entryId);
  persistEntries();
  renderEntries();
});

resultsBody.addEventListener("input", (event) => {
  if (!event.target.classList.contains("result__description-input")) {
    return;
  }

  const row = event.target.closest("tr");

  if (!row) {
    return;
  }

  const { entryId } = row.dataset;
  const entry = entries.find((item) => item.id === entryId);

  if (!entry) {
    return;
  }

  entry.description = event.target.value;
  persistEntries();
});

function loadEntries() {
  entries = readStoredEntries();
  renderEntries();
}

function renderEntries() {
  resultsBody.innerHTML = "";

  entries.forEach((entry) => {
    const row = document.createElement("tr");
    row.dataset.entryId = entry.id;

    const removeCell = document.createElement("td");
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "result__remove-button";
    removeButton.setAttribute("aria-label", "Fjern raden");
    removeButton.textContent = "×";
    removeCell.appendChild(removeButton);

    const durationCell = document.createElement("td");
    const durationStrong = document.createElement("strong");
    durationStrong.textContent = formatDuration(entry.durationMinutes);
    durationCell.appendChild(durationStrong);
    const portionInfo = document.createElement("div");
    portionInfo.className = "result__portion";
    portionInfo.textContent = entry.fractionLabel;
    durationCell.appendChild(portionInfo);

    const endTimeCell = document.createElement("td");
    endTimeCell.textContent = dateTimeFormatter.format(new Date(entry.completionISO));

    const descriptionCell = document.createElement("td");
    const descriptionInput = document.createElement("input");
    descriptionInput.type = "text";
    descriptionInput.className = "result__description-input";
    descriptionInput.placeholder = "Legg til beskrivelse";
    descriptionInput.value = entry.description || "";
    descriptionCell.appendChild(descriptionInput);

    row.append(removeCell, durationCell, endTimeCell, descriptionCell);
    resultsBody.appendChild(row);
  });

  resultSection.hidden = entries.length === 0;
}

function showError(message) {
  errorMessage.textContent = message;
}

function clearError() {
  errorMessage.textContent = "";
}

function readStoredEntries() {
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
        id: entry.id,
        durationMinutes: entry.durationMinutes,
        completionISO: entry.completionISO,
        fractionLabel: entry.fractionLabel,
        description: entry.description || "",
      }))
      .filter(
        (entry) =>
          typeof entry.id === "string" &&
          typeof entry.durationMinutes === "number" &&
          typeof entry.completionISO === "string" &&
          typeof entry.fractionLabel === "string"
      );
  } catch (error) {
    return [];
  }
}

function persistEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    // Ignorer lagringsfeil (f.eks. hvis lagring er deaktivert)
  }
}

function generateEntryId() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase();
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
