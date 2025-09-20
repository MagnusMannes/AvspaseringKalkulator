const form = document.getElementById("avspasering-form");
const arrivalInput = document.getElementById("arrival");
const departureInput = document.getElementById("departure");
const portionSelect = document.getElementById("portion");
const errorMessage = document.getElementById("error-message");
const resultSection = document.getElementById("result");
const resultDuration = document.getElementById("result-duration");
const resultEndTime = document.getElementById("result-end-time");
const selectedFraction = document.getElementById("selected-fraction");

const dateTimeFormatter = new Intl.DateTimeFormat("no-NO", {
  dateStyle: "full",
  timeStyle: "short",
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  hideResult();
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
  const completion = new Date(arrival.getTime() + avspaseringMinutes * 60000);

  selectedFraction.textContent = `Valgt andel: ${portionSelect.options[portionSelect.selectedIndex].text}`;
  resultDuration.textContent = durationText;
  resultEndTime.textContent = dateTimeFormatter.format(completion);

  errorMessage.textContent = "";
  resultSection.hidden = false;
});

function hideResult() {
  resultSection.hidden = true;
}

function showError(message) {
  errorMessage.textContent = message;
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
