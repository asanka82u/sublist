let electricalData = [];

// Load data from local storage
function loadData() {
  const data = localStorage.getItem("electricalData");
  if (data) {
    electricalData = JSON.parse(data);
  }
}

// Save data to local storage
function saveData() {
  localStorage.setItem("electricalData", JSON.stringify(electricalData));
}

// Display records in the table
function displayRecords(records) {
  const tbody = document.querySelector("#records-table tbody");
  tbody.innerHTML = "";
  records.forEach((record) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${record.SIN}</td>
      <td>${record["Feeder Id"]}</td>
      <td>${record["Substation Name"]}</td>
      <td>${record.Type}</td>
      <td>${record.Capacity}</td>
      <td>${record.kV}</td>
      <td>${formatDate(record.LastMaintenanceDate)}</td>
      <td>${formatDate(record.NextMaintenanceDate)}</td>
      <td>
        <button class="btn btn-warning edit-btn" data-sin="${
          record.SIN
        }">Edit</button>
        <button class="btn btn-danger delete-btn" data-sin="${
          record.SIN
        }">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Format date
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Add a new record
function addRecord(event) {
  event.preventDefault();
  const newRecord = {
    SIN: document.getElementById("sin").value,
    "Feeder Id": document.getElementById("feeder-id").value,
    "Substation Name": document.getElementById("substation-name").value,
    Type: document.getElementById("type").value,
    Capacity: document.getElementById("capacity").value,
    kV: document.getElementById("kv").value,
    LastMaintenanceDate: document.getElementById("last-maintenance-date").value,
    NextMaintenanceDate: calculateNextMaintenanceDate(
      document.getElementById("last-maintenance-date").value
    ),
  };
  electricalData.push(newRecord);
  saveData();
  displayRecords(electricalData);
  clearForm();
}

// Update a record
function updateRecord(sin) {
  const record = electricalData.find((item) => item.SIN === sin);
  document.getElementById("record-id").value = sin;
  document.getElementById("sin").value = record.SIN;
  document.getElementById("feeder-id").value = record["Feeder Id"];
  document.getElementById("substation-name").value = record["Substation Name"];
  document.getElementById("type").value = record.Type;
  document.getElementById("capacity").value = record.Capacity;
  document.getElementById("kv").value = record.kV;
  document.getElementById("last-maintenance-date").value =
    record.LastMaintenanceDate;
}

// Delete a record
function deleteRecord(sin) {
  electricalData = electricalData.filter((item) => item.SIN !== sin);
  saveData();
  displayRecords(electricalData);
}

// Clear the form
function clearForm() {
  document.getElementById("record-form").reset();
  document.getElementById("record-id").value = "";
}

// Search by SIN
function searchBySIN() {
  const searchTerm = document
    .getElementById("search-sin")
    .value.trim()
    .toUpperCase();
  const matchingRecords = electricalData.filter((item) =>
    item.SIN.toUpperCase().includes(searchTerm)
  );
  displayRecords(matchingRecords);
}

// Calculate next maintenance date
function calculateNextMaintenanceDate(lastMaintenanceDate) {
  if (!lastMaintenanceDate) return null;
  const lastDate = new Date(lastMaintenanceDate);
  const nextDate = new Date(lastDate.getTime() + 3 * 365 * 24 * 60 * 60 * 1000);
  return nextDate.toISOString().split("T")[0];
}

// Event Listeners
document.getElementById("record-form").addEventListener("submit", addRecord);
document.getElementById("search-btn").addEventListener("click", searchBySIN);
document.getElementById("update-btn").addEventListener("click", () => {
  const sin = document.getElementById("record-id").value;
  if (sin) {
    const updatedRecord = {
      SIN: document.getElementById("sin").value,
      "Feeder Id": document.getElementById("feeder-id").value,
      "Substation Name": document.getElementById("substation-name").value,
      Type: document.getElementById("type").value,
      Capacity: document.getElementById("capacity").value,
      kV: document.getElementById("kv").value,
      LastMaintenanceDate: document.getElementById("last-maintenance-date")
        .value,
      NextMaintenanceDate: calculateNextMaintenanceDate(
        document.getElementById("last-maintenance-date").value
      ),
    };
    const index = electricalData.findIndex((item) => item.SIN === sin);
    if (index !== -1) {
      electricalData[index] = updatedRecord;
      saveData();
      displayRecords(electricalData);
      clearForm();
    }
  }
});
document.getElementById("delete-btn").addEventListener("click", () => {
  const sin = document.getElementById("record-id").value;
  if (sin) {
    deleteRecord(sin);
    clearForm();
  }
});

// Add event listeners for edit and delete buttons
document
  .querySelector("#records-table tbody")
  .addEventListener("click", (event) => {
    if (event.target.classList.contains("edit-btn")) {
      const sin = event.target.getAttribute("data-sin");
      updateRecord(sin);
    } else if (event.target.classList.contains("delete-btn")) {
      const sin = event.target.getAttribute("data-sin");
      deleteRecord(sin);
    }
  });

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  // Do not display records initially
  // displayRecords(electricalData);
});
