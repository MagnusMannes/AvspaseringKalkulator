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

    row.append(durationCell, completionCell, descriptionCell, actionsCell);
    resultRows.append(row);
  });

  if (entries[0].fractionLabel) {
    selectedFraction.textContent = `Valgt andel: ${entries[0].fractionLabel}`;
  } else {
    selectedFraction.textContent = "";
  }
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
