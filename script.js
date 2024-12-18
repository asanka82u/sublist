let electricalData = [];

// Enhanced data loading with error handling and retry mechanism
async function loadData(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch("updated_data.json");
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      electricalData = await response.json();
      updateSummaryStats();
      return true;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === retries - 1) {
        showError(
          "Failed to load data. Please refresh the page or contact support."
        );
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// DOM Elements
const elements = {
  searchInput: document.getElementById("sin-search"),
  searchBtn: document.getElementById("search-btn"),
  maintenanceBtn: document.getElementById("maintenance-btn"),
  maintenanceNextMonthBtn: document.getElementById(
    "maintenance-next-month-btn"
  ),
  typeFilter: document.getElementById("type-filter"),
  dateRange: document.getElementById("date-range"),
  resultsContainer: document.getElementById("results"),
  noResultsMsg: document.getElementById("no-results"),
  exportBtn: document.getElementById("export-btn"),
  summaryStats: document.getElementById("summary-stats"),
  totalRecords: document.getElementById("total-records"),
  maintenanceDue: document.getElementById("maintenance-due"),
  nextMonthDue: document.getElementById("next-month-due"),
};

// Helper Functions
function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  document.body.insertBefore(errorDiv, document.body.firstChild);
  setTimeout(() => errorDiv.remove(), 5000);
}

function clearResults() {
  elements.resultsContainer.innerHTML = "";
  elements.resultsContainer.classList.remove("show");
  elements.noResultsMsg.classList.add("hidden");
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function displayRecord(record) {
  const resultItem = document.createElement("div");
  resultItem.classList.add("result-item");
  resultItem.innerHTML = `
        <strong>SIN:</strong> ${record.SIN}<br>
        <strong>Feeder Id:</strong> ${record["Feeder Id"]}<br>
        <strong>Substation Name:</strong> ${record["Substation Name"]}<br>
        <strong>Type:</strong> ${record.Type}<br>
        <strong>Capacity:</strong> ${record.Capacity}<br>
        <strong>kV:</strong> ${record.kV}<br>
        <strong>Last Maintenance Date:</strong> ${formatDate(
          record.LastMaintenanceDate
        )}<br>
        <strong>Next Maintenance Date:</strong> ${formatDate(
          record.NextMaintenanceDate
        )}
    `;
  elements.resultsContainer.appendChild(resultItem);
}

// Main Functions
function updateSummaryStats() {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const dueMaintenance = electricalData.filter(
    (item) =>
      !item.NextMaintenanceDate || new Date(item.NextMaintenanceDate) <= today
  );

  const nextMonthMaintenance = electricalData.filter((item) => {
    const maintenanceDate = new Date(item.NextMaintenanceDate);
    return maintenanceDate > today && maintenanceDate <= nextMonth;
  });

  elements.totalRecords.textContent = electricalData.length;
  elements.maintenanceDue.textContent = dueMaintenance.length;
  elements.nextMonthDue.textContent = nextMonthMaintenance.length;
  elements.summaryStats.classList.remove("hidden");
}

function searchBySIN() {
  clearResults();
  const searchTerm = elements.searchInput.value.trim().toUpperCase();

  if (!searchTerm) {
    showError("Please enter a SIN to search");
    return;
  }

  const matchingRecords = electricalData.filter((item) =>
    item.SIN.toUpperCase().includes(searchTerm)
  );

  if (matchingRecords.length > 0) {
    elements.resultsContainer.classList.add("show");
    matchingRecords.forEach(displayRecord);
  } else {
    elements.noResultsMsg.classList.remove("hidden");
  }
}

// ... (previous code remains the same until listDueForMaintenance function)

function listDueForMaintenance() {
  clearResults();
  const today = new Date();
  const selectedType = elements.typeFilter.value;
  const selectedRange = elements.dateRange.value;
  const threeYearsInMs = 3 * 365 * 24 * 60 * 60 * 1000; // 3 years in milliseconds

  let endDate = new Date();
  switch (selectedRange) {
    case "thisMonth":
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case "nextMonth":
      endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      break;
    case "next3Months":
      endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0);
      break;
  }

  const dueForMaintenance = electricalData.filter((item) => {
    // Check if the type matches the filter
    const typeMatch = selectedType === "All" || item.Type === selectedType;

    // Calculate when maintenance is due based on last maintenance date
    const lastMaintenance = item.LastMaintenanceDate
      ? new Date(item.LastMaintenanceDate)
      : null;
    const nextDueDate = lastMaintenance
      ? new Date(lastMaintenance.getTime() + threeYearsInMs)
      : null;

    // If no last maintenance date, it's due immediately
    if (!lastMaintenance) {
      return typeMatch;
    }

    // Check if maintenance is due (more than 3 years since last maintenance)
    const isDue = today >= nextDueDate;

    // For date range filtering
    const dateMatch =
      selectedRange === "all" ||
      (nextDueDate >= today && nextDueDate <= endDate);

    // Return true if type matches and either it's past due or falls within selected date range
    return typeMatch && (isDue || dateMatch);
  });

  if (dueForMaintenance.length > 0) {
    elements.resultsContainer.classList.add("show");
    // Sort by maintenance due date (oldest first)
    dueForMaintenance.sort((a, b) => {
      const dateA = a.LastMaintenanceDate
        ? new Date(a.LastMaintenanceDate)
        : new Date(0);
      const dateB = b.LastMaintenanceDate
        ? new Date(b.LastMaintenanceDate)
        : new Date(0);
      return dateA - dateB;
    });
    dueForMaintenance.forEach((record) => {
      const lastMaintenance = record.LastMaintenanceDate
        ? new Date(record.LastMaintenanceDate)
        : null;
      const nextDueDate = lastMaintenance
        ? new Date(lastMaintenance.getTime() + threeYearsInMs)
        : "No previous maintenance";

      // Calculate days overdue or remaining
      const daysOverdue = lastMaintenance
        ? Math.floor((today - nextDueDate) / (1000 * 60 * 60 * 24))
        : null;

      // Add maintenance status to the display
      const resultItem = document.createElement("div");
      resultItem.classList.add("result-item");
      let maintenanceStatus = "";

      if (!lastMaintenance) {
        maintenanceStatus =
          '<strong style="color: red;">Status: Never maintained</strong>';
      } else if (daysOverdue > 0) {
        maintenanceStatus = `<strong style="color: red;">Status: Overdue by ${daysOverdue} days</strong>`;
      } else {
        maintenanceStatus = `<strong style="color: green;">Status: Due in ${Math.abs(
          daysOverdue
        )} days</strong>`;
      }

      resultItem.innerHTML = `
              <strong>SIN:</strong> ${record.SIN}<br>
              <strong>Feeder Id:</strong> ${record["Feeder Id"]}<br>
              <strong>Substation Name:</strong> ${record["Substation Name"]}<br>
              <strong>Type:</strong> ${record.Type}<br>
              <strong>Capacity:</strong> ${record.Capacity}<br>
              <strong>kV:</strong> ${record.kV}<br>
              <strong>Last Maintenance Date:</strong> ${formatDate(
                record.LastMaintenanceDate
              )}<br>
              <strong>Next Due Date:</strong> ${formatDate(nextDueDate)}<br>
              ${maintenanceStatus}
          `;
      elements.resultsContainer.appendChild(resultItem);
    });
  } else {
    elements.noResultsMsg.classList.remove("hidden");
    elements.noResultsMsg.textContent =
      "No substations found matching the selected criteria.";
  }
}

// Update the summary stats function to use the 3-year cycle
function updateSummaryStats() {
  const today = new Date();
  const threeYearsInMs = 3 * 365 * 24 * 60 * 60 * 1000;

  const dueMaintenance = electricalData.filter((item) => {
    const lastMaintenance = item.LastMaintenanceDate
      ? new Date(item.LastMaintenanceDate)
      : null;
    if (!lastMaintenance) return true;
    const nextDueDate = new Date(lastMaintenance.getTime() + threeYearsInMs);
    return today >= nextDueDate;
  });

  const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  const nextMonthMaintenance = electricalData.filter((item) => {
    const lastMaintenance = item.LastMaintenanceDate
      ? new Date(item.LastMaintenanceDate)
      : null;
    if (!lastMaintenance) return false;
    const nextDueDate = new Date(lastMaintenance.getTime() + threeYearsInMs);
    return nextDueDate > today && nextDueDate <= nextMonthEnd;
  });

  elements.totalRecords.textContent = electricalData.length;
  elements.maintenanceDue.textContent = dueMaintenance.length;
  elements.nextMonthDue.textContent = nextMonthMaintenance.length;
  elements.summaryStats.classList.remove("hidden");
}

// ... (rest of the code remains the same)

function listMaintenanceNextMonth() {
  clearResults();
  const today = new Date();
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  const selectedType = elements.typeFilter.value;

  const nextMonthMaintenance = electricalData.filter((item) => {
    const nextMaintenance = new Date(item.NextMaintenanceDate);
    const typeMatch = selectedType === "All" || item.Type === selectedType;
    return (
      typeMatch &&
      nextMaintenance >= nextMonthStart &&
      nextMaintenance <= nextMonthEnd
    );
  });

  if (nextMonthMaintenance.length > 0) {
    elements.resultsContainer.classList.add("show");
    nextMonthMaintenance.forEach(displayRecord);
  } else {
    elements.noResultsMsg.classList.remove("hidden");
    elements.noResultsMsg.textContent =
      "No substations scheduled for maintenance next month.";
  }
}

function exportToCSV() {
  if (!elements.resultsContainer.children.length) {
    showError("No data to export");
    return;
  }

  const headers = [
    "SIN",
    "Feeder Id",
    "Substation Name",
    "Type",
    "Capacity",
    "kV",
    "Last Maintenance Date",
    "Next Maintenance Date",
  ];
  const rows = [headers];

  Array.from(
    elements.resultsContainer.getElementsByClassName("result-item")
  ).forEach((item) => {
    const rowData = item.textContent
      .split("\n")
      .map((field) => field.split(":")[1]?.trim() || "")
      .filter((field) => field !== "");
    rows.push(rowData);
  });

  const csvContent =
    "text/csv;charset=utf-8," + rows.map((row) => row.join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `maintenance_report_${new Date().toISOString().split("T")[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Debounce function for search input
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Event Listeners
elements.searchBtn.addEventListener("click", searchBySIN);
elements.maintenanceBtn.addEventListener("click", listDueForMaintenance);
elements.maintenanceNextMonthBtn.addEventListener(
  "click",
  listMaintenanceNextMonth
);
elements.exportBtn.addEventListener("click", exportToCSV);

// Add debounced search on input
elements.searchInput.addEventListener(
  "input",
  debounce(() => {
    if (elements.searchInput.value.trim().length >= 2) {
      searchBySIN();
    }
  }, 300)
);

// Add enter key support for search
elements.searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    searchBySIN();
  }
});

// Add filter change handlers
elements.typeFilter.addEventListener("change", () => {
  if (elements.resultsContainer.classList.contains("show")) {
    listDueForMaintenance();
  }
});

elements.dateRange.addEventListener("change", () => {
  if (elements.resultsContainer.classList.contains("show")) {
    listDueForMaintenance();
  }
});

// Initialize the application
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  // Set default date range to 'all'
  elements.dateRange.value = "all";
  // Update summary stats
  updateSummaryStats();
});

// Add window error handler
window.addEventListener("error", (error) => {
  console.error("Global error:", error);
  showError("An unexpected error occurred. Please refresh the page.");
});

// Helper function to escape CSV values
function escapeCSV(value) {
  if (value === null || value === undefined) return "";
  return `"${value.toString().replace(/"/g, '""')}"`;
}

// Helper function to convert date for CSV
function formatDateForCSV(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD format
}

function exportToCSV() {
  if (!elements.resultsContainer.children.length) {
    showError("No data to export");
    return;
  }

  try {
    // Define headers
    const headers = [
      "SIN",
      "Feeder Id",
      "Substation Name",
      "Type",
      "Capacity",
      "kV",
      "Last Maintenance Date",
      "Next Maintenance Date",
      "Maintenance Status",
    ];

    // Start with headers
    let csvContent = headers.map(escapeCSV).join(",") + "\n";

    // Get all result items
    const items = Array.from(
      elements.resultsContainer.getElementsByClassName("result-item")
    );

    // Process each item
    items.forEach((item) => {
      // Extract data from the item's content
      const lines = item.innerHTML.split("<br>");
      const rowData = {};

      // Parse the HTML content
      lines.forEach((line) => {
        if (line.includes("</strong>")) {
          const [key, value] = line.split("</strong>");
          const cleanKey = key
            .replace(/<strong>/g, "")
            .replace(":", "")
            .trim();
          const cleanValue = value.trim();
          rowData[cleanKey] = cleanValue;
        }
      });

      // Create row array in the same order as headers
      const row = [
        rowData["SIN"] || "",
        rowData["Feeder Id"] || "",
        rowData["Substation Name"] || "",
        rowData["Type"] || "",
        rowData["Capacity"] || "",
        rowData["kV"] || "",
        rowData["Last Maintenance Date"] || "",
        rowData["Next Due Date"] || "",
        rowData["Status"] || "",
      ];

      // Add the row to CSV content
      csvContent += row.map(escapeCSV).join(",") + "\n";
    });

    // Create blob with UTF-8 BOM for Excel compatibility
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    // Create download link
    const link = document.createElement("a");

    // Create the URL for the blob
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      // For IE
      window.navigator.msSaveOrOpenBlob(blob, getFileName());
    } else {
      // For other browsers
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      link.download = getFileName();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error("Export error:", error);
    showError("Failed to export data. Please try again.");
  }
}

// Helper function to generate filename with current date
function getFileName() {
  const date = new Date();
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
  const timeStr = date.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS
  return `maintenance_report_${dateStr}_${timeStr}.csv`;
}

// Add error handling to the file creation
function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #ff4444;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `;
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => {
    errorDiv.style.opacity = "0";
    errorDiv.style.transition = "opacity 0.5s ease";
    setTimeout(() => errorDiv.remove(), 500);
  }, 3000);
}

// Update the event listener for the export button
if (elements.exportBtn) {
  elements.exportBtn.addEventListener("click", exportToCSV);
} else {
  console.error("Export button not found in the DOM");
}

// Optional: Add keyboard shortcut for export (Ctrl/Cmd + E)
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "e") {
    e.preventDefault();
    if (elements.resultsContainer.children.length > 0) {
      exportToCSV();
    }
  }
});
