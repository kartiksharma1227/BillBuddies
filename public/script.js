const expenseAddedBySelect = document.getElementById("expense-added-by");
const memberNameInput = document.getElementById("member-name-input");
const memberEmailInput = document.getElementById("member-email-input");
const addMemberBtn = document.getElementById("add-member-btn");
const expenseReceiptInput = document.getElementById("expense-receipt");
const memberQrInput = document.getElementById("member-qr-input");


let groupTitle = "";
let groupMembers = [];
let groupCurrency = "₹"; // Fixed to Indian Rupees
let expenses = [];

// DOM element references
const groupSection = document.getElementById("group-section");
const expenseSection = document.getElementById("expense-section");
const createGroupBtn = document.getElementById("create-group-btn");
const groupTitleInput = document.getElementById("group-title");

const expensePaidBySelect = document.getElementById("expense-paid-by");
const expenseAmountInput = document.getElementById("expense-amount");
const expenseDescriptionInput = document.getElementById("expense-description");
const participantsCheckboxesDiv = document.getElementById(
  "participants-checkboxes"
);
const addExpenseBtn = document.getElementById("add-expense-btn");
const expensesListDiv = document.getElementById("expenses-list");
const calculateSettlementBtn = document.getElementById(
  "calculate-settlement-btn"
);
const settlementsListDiv = document.getElementById("settlements-list");

const membersList = document.getElementById("members-list");

let members = [];

// Add these new DOM references with your other DOM references
const expenseMemberInput = document.getElementById("expense-member-input");
const expenseAddMemberBtn = document.getElementById("expense-add-member-btn");
const expenseMembersList = document.getElementById("expense-members-list");

// Add these new DOM references with your other DOM references
const editGroupBtn = document.getElementById("edit-group-btn");
const membersManagement = document.getElementById("members-management");

// Add these DOM references with your other references
const groupTitleDisplay = document.getElementById("group-title-display");
const groupMembersDisplay = document.getElementById("group-members-display");

// Add these variables at the top
let tripId = null;
const API_URL = "http://localhost:8000/api";

// Event listener to create group
createGroupBtn.addEventListener("click", async () => {
  groupTitle = groupTitleInput.value.trim();
  if (!groupTitle) {
    alert("Please enter a group title.");
    return;
  }

  if (members.length === 0) {
    alert("Please add at least one member.");
    return;
  }

  groupMembers = [...members];

  try {
    // Create new trip in database
    const response = await fetch(`${API_URL}/trips`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        groupTitle,
        groupMembers,
      }),
    });
    const data = await response.json();
    tripId = data.tripId;

    // Update URL with trip ID
    window.history.pushState({}, "", `?trip=${tripId}`);

    // Update UI
    groupTitleDisplay.textContent = groupTitle;
    updateGroupMembersDisplay();
    groupSection.classList.add("hidden");
    expenseSection.classList.remove("hidden");
    populateMembers();
  } catch (error) {
    alert("Error creating group: " + error.message);
  }
});

function populateMembers() {
  expensePaidBySelect.innerHTML = "";
  expenseAddedBySelect.innerHTML = "";
  participantsCheckboxesDiv.innerHTML = "";

  groupMembers.forEach((member) => {
    // Dropdown: Paid By
    const option = document.createElement("option");
    option.value = member.name;
    option.textContent = member.name;
    expensePaidBySelect.appendChild(option);

    // Dropdown: Added By
    const option2 = document.createElement("option");
    option2.value = member.name;
    option2.textContent = member.name;
    expenseAddedBySelect.appendChild(option2);

    // Checkboxes: Participants
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = member.name;
    checkbox.checked = true;
    checkbox.id = `participant-${member.name}`;
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(" " + member.name));
    participantsCheckboxesDiv.appendChild(label);
  });

  renderExpenseMembers();
  updateGroupMembersDisplay();
}

addExpenseBtn.addEventListener("click", async () => {
  const paidBy = expensePaidBySelect.value;
  const amount = parseFloat(expenseAmountInput.value);
  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid amount.");
    return;
  }
  const description = expenseDescriptionInput.value.trim();
  const category = document.getElementById("expense-category").value;
  const addedBy = expenseAddedBySelect.value;

  // ✅ Collect selected participants from checkboxes
  let selectedParticipants = [];
  document
    .querySelectorAll("#participants-checkboxes input:checked")
    .forEach((cb) => selectedParticipants.push(cb.value)); // Just the name string

  if (selectedParticipants.length === 0) {
    alert("Please select at least one participant.");
    return;
  }

  // Validate required fields
  if (!paidBy) {
    alert("Please select who paid for this expense.");
    return;
  }

  if (!description.trim()) {
    alert("Please enter a description for this expense.");
    return;
  }

  if (!addedBy) {
    alert("Please select who is adding this expense.");
    return;
  }

  // ✅ Step 1: Save expense (without receipt first)
  let expenseId = null;
  try {
    console.log("Saving expense with data:", {
      paidBy,
      amount,
      participants: selectedParticipants,
      description,
      category,
      addedBy,
      members: members,
      groupMembers: groupMembers,
      expenses: expenses,
    });

    // Ensure all required fields are present
    const expenseData = {
      paidBy: String(paidBy),
      amount: Number(amount),
      participants: selectedParticipants.map((p) => String(p)), // Ensure strings
      description: String(description),
      category: String(category || "General"),
      addedBy: String(addedBy),
      timestamp: new Date().toISOString(),
    };

    console.log("Formatted expense data:", expenseData);

    const res = await fetch(`${API_URL}/trips/${tripId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupTitle: groupTitle, // include existing trip data
        // groupMembers: members,//!CHNAGED
        groupMembers: members.map((m) => ({
          name: m.name || m,
          email: m.email || "",
          qrCodeUrl: m.qrCodeUrl || "",
        })),

        expenses: [...expenses, expenseData],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Server error:", errorText);
      throw new Error(`Server error: ${res.status} - ${errorText}`);
    }

    const updatedTrip = await res.json();

    // Safety check: ensure expenses array exists
    if (
      !updatedTrip ||
      !updatedTrip.expenses ||
      updatedTrip.expenses.length === 0
    ) {
      throw new Error("Invalid response: no expenses found");
    }

    const lastExpense = updatedTrip.expenses[updatedTrip.expenses.length - 1];

    if (!lastExpense || !lastExpense._id) {
      throw new Error("Invalid expense: missing ID");
    }

    expenseId = lastExpense._id;
    expenses = updatedTrip.expenses; // keep local in sync
  } catch (err) {
    console.error("❌ Error saving expense:", err);
    alert("Failed to save expense. Try again.");
    return;
  }

  // ✅ Step 2: Upload receipt if selected
  let receiptUrl = null;
  if (expenseReceiptInput.files.length > 0 && expenseId) {
    const file = expenseReceiptInput.files[0];
    const formData = new FormData();
    formData.append("receipt", file);

    try {
      const res = await fetch(
        `${API_URL}/trips/${tripId}/expenses/${expenseId}/receipt`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed: ${text}`);
      }

      const data = await res.json();
      receiptUrl = data.url;

      // Update expense locally with receiptUrl
      const exp = expenses.find((e) => e._id === expenseId);
      if (exp) exp.receiptUrl = receiptUrl;

      displayExpenses();
    } catch (err) {
      console.error("❌ Error uploading receipt:", err);
      alert("Failed to upload receipt. Try again.");
    }
  }

  // ✅ Step 3: Update frontend display
  expenseAmountInput.value = "";
  expenseDescriptionInput.value = "";
  expenseReceiptInput.value = ""; // clear file input
  displayExpenses();
  updateTotalExpense();
  await saveTripData();
});

// Display the list of added expenses
function displayExpenses() {
  expensesListDiv.innerHTML = "";
  if (expenses.length === 0) {
    expensesListDiv.textContent = "No expenses added yet.";
    return;
  }

  // console.log("EXPENSES", expenses);

  expenses.forEach((expense, index) => {
    const div = document.createElement("div");
    div.className = "expense-item";
    const expenseName = expense.description || "Expense " + (index + 1);
    div.innerHTML = `
            <strong>${expenseName}</strong><br>
            ${
              expense.paidBy
            } paid <span class="amount-highlight">${groupCurrency} ${expense.amount.toFixed(
      2
    )}</span>
            <br>Split between: ${expense.participants.map((p) => p).join(", ")}
            <div class="expense-date">Added by ${
              expense.addedBy || "Unknown"
            } on ${formatDate(expense.timestamp)}</div>
            <div class="expense-actions">
              <button class="edit-btn action-button" onclick="editExpense(${index})">Edit</button>
              <button class="delete-btn action-button" onclick="deleteExpense(${index})">Delete</button>
            </div>
          `;

    if (expense.receiptUrl) {
      const receiptDiv = document.createElement("div");
      receiptDiv.className = "receipt-preview";

      if (expense.receiptUrl.endsWith(".pdf")) {
        receiptDiv.innerHTML = `<a href="${expense.receiptUrl}" target="_blank">📎 View Receipt (PDF)</a>`;
      } else {
        receiptDiv.innerHTML = `
      <a href="${expense.receiptUrl}" target="_blank">
        <img src="${expense.receiptUrl}" alt="Receipt" class="receipt-thumb"/>
      </a>
    `;
      }
      div.appendChild(receiptDiv);
    }

    expensesListDiv.appendChild(div);
  });
}

calculateSettlementBtn.addEventListener("click", async () => {
  if (expenses.length === 0) {
    alert("No expenses to settle.");
    return;
  }

  const transactions = calculateSettlements(expenses);

  // 1️⃣ Show immediately
  displaySettlements(transactions);

  console.log("TRANSACTIONS", transactions);

  // 2️⃣ Save to backend → sends emails + stores with pending status
  try {
    const res = await fetch(`${API_URL}/trips/${tripId}/settlements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settlements: transactions }),
    });
    const saved = await res.json();
    console.log("Settlements saved:", saved);

    // 3️⃣ Refresh UI with backend’s version (with [Pending] statuses)
    displaySettlements(saved);
  } catch (err) {
    console.error("❌ Error saving settlements:", err);
  }
});

// function displaySettlements(transactions) {
//   settlementsListDiv.innerHTML = "";
//   if (transactions.length === 0) {
//     settlementsListDiv.textContent = "Everything is settled up!";
//     return;
//   }

//   transactions.forEach((tx, index) => {
//     const div = document.createElement("div");
//     div.className = "transaction";

//     let statusHtml = "";
//     if (tx.status === "paid") {
//       const paidDate = tx.settledAt
//         ? new Date(tx.settledAt).toLocaleString()
//         : "";
//       statusHtml = `<span class="status">✅ Paid ${
//         paidDate ? "on " + paidDate : ""
//       }</span>`;
//     } else {
//       statusHtml = `<span class="status">[pending]</span>
//         <button class="mark-paid-btn" onclick="markAsPaid(${index})">
//           Mark as Paid
//         </button>`;
//     }

//     div.innerHTML = `
//       <strong>${tx.from}</strong> pays <strong>${tx.to}</strong>:
//       <span class="amount-highlight">${groupCurrency} ${tx.amount.toFixed(
//       2
//     )}</span>
//       ${statusHtml}
//     `;

//     settlementsListDiv.appendChild(div);
//   });
// }


function displaySettlements(transactions) {
  settlementsListDiv.innerHTML = "";
  if (transactions.length === 0) {
    settlementsListDiv.textContent = "Everything is settled up!";
    return;
  }

  transactions.forEach((tx, index) => {
    const div = document.createElement("div");
    div.className = "transaction";

    let statusHtml = "";

    if (tx.status === "paid") {
      const paidDate = tx.settledAt
        ? new Date(tx.settledAt).toLocaleString()
        : "";
      statusHtml = `<span class="status">✅ Paid ${paidDate ? "on " + paidDate : ""}</span>`;

      if (tx.proofUrl) {
        statusHtml += `<div><a href="${tx.proofUrl}" target="_blank">📎 View Proof</a></div>`;
      }

    } else if (tx.status === "proof_uploaded") {
      // Payee must approve
      statusHtml = `
        <span class="status">📎 Proof Uploaded – Awaiting Approval</span>
        <div><a href="${tx.proofUrl}" target="_blank">📷 View Screenshot</a></div>
        <button class="approve-btn" onclick="approvePayment(${index})">Approve</button>
      `;

    } else {
      // Normal pending state → show upload option for debtor
      statusHtml = `
        <span class="status">[pending]</span>
        <button class="upload-proof-btn" onclick="document.getElementById('proof-input-${index}').click()">Upload Screenshot</button>
        <input type="file" id="proof-input-${index}" style="display:none" accept="image/*,.pdf" onchange="uploadProof(${index}, this.files[0])" />
      `;
    }

    div.innerHTML = `
      <strong>${tx.from}</strong> pays <strong>${tx.to}</strong>:
      <span class="amount-highlight">${groupCurrency} ${tx.amount.toFixed(2)}</span>
      ${statusHtml}
    `;

    settlementsListDiv.appendChild(div);
  });
}

async function uploadProof(index, file) {
  if (!file) return;

  const formData = new FormData();
  formData.append("proof", file);

  try {
    const res = await fetch(`${API_URL}/trips/${tripId}/settlements/${index}/proof`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error(await res.text());

    const updated = await res.json();
    displaySettlements(updated);
    showNotification("📎 Proof uploaded successfully!");
  } catch (err) {
    console.error("❌ Error uploading proof:", err);
    showNotification("❌ Failed to upload proof");
  }
}

async function approvePayment(index) {
  try {
    const res = await fetch(`${API_URL}/trips/${tripId}/settlements/${index}/approve`, {
      method: "PUT",
    });

    if (!res.ok) throw new Error(await res.text());

    const updated = await res.json();
    displaySettlements(updated);
    showNotification("✅ Payment approved!");
  } catch (err) {
    console.error("❌ Error approving payment:", err);
    showNotification("❌ Failed to approve payment");
  }
}



async function markAsPaid(index) {
  try {
    const res = await fetch(
      `${API_URL}/trips/${tripId}/settlements/${index}/paid`,
      {
        method: "PUT",
      }
    );
    const updated = await res.json();

    // Refresh UI with updated statuses
    displaySettlements(updated);

    // Show success toast
    showNotification("✅ Settlement marked as paid!");
  } catch (err) {
    console.error("❌ Error marking as paid:", err);
    showNotification("❌ Failed to update settlement");
  }
}

// /**

/**
 * Optimized Settlement using Minimum Cash Flow Algorithm
 * Reduces number of transactions compared to greedy approach
 */

function calculateSettlements(expenses) {
  console.log("INSIDE CALCULATESETTLEMENTS: expenses", expenses);
  const balances = {};
  groupMembers.forEach((member) => (balances[member.name] = 0));

  expenses.forEach((expense) => {
    const { paidBy, amount, participants } = expense;
    const share = amount / participants.length;

    participants.forEach((p) => {
      balances[p] -= share;
    });

    balances[paidBy] += amount;
  });

  const members = Object.keys(balances);
  const net = members.map((m) => balances[m]);
  const transactions = [];

  // Safety check: if no members or all balances are zero, return empty
  if (members.length === 0 || net.every((val) => Math.abs(val) < 1e-6)) {
    return transactions;
  }

  function getMaxIndex(arr) {
    return arr.reduce(
      (maxIdx, val, idx, a) => (val > a[maxIdx] ? idx : maxIdx),
      0
    );
  }
  function getMinIndex(arr) {
    return arr.reduce(
      (minIdx, val, idx, a) => (val < a[minIdx] ? idx : minIdx),
      0
    );
  }

  function minimizeCashFlow(net, depth = 0) {
    // Safety: prevent infinite recursion
    if (depth > members.length * 2) {
      console.warn(
        "Max recursion depth reached, stopping settlement calculation"
      );
      return;
    }

    const mxCredit = getMaxIndex(net);
    const mxDebit = getMinIndex(net);

    // Improved base case: stop if maximum credit OR minimum debt is near zero
    // OR if the amount to transfer would be negligible
    if (Math.abs(net[mxCredit]) < 1e-6 || Math.abs(net[mxDebit]) < 1e-6) return;

    const minAmount = Math.min(-net[mxDebit], net[mxCredit]);

    // Additional safety: stop if transfer amount is too small
    if (minAmount < 1e-6) return;

    net[mxCredit] = parseFloat((net[mxCredit] - minAmount).toFixed(2));
    net[mxDebit] = parseFloat((net[mxDebit] + minAmount).toFixed(2));

    transactions.push({
      from: members[mxDebit],
      to: members[mxCredit],
      amount: parseFloat(minAmount.toFixed(2)),
    });

    minimizeCashFlow(net, depth + 1);
  }

  // Call the function and return transactions
  minimizeCashFlow(net);
  return transactions;
}

// Theme toggle functionality
const themeToggle = document.getElementById("theme-toggle");
const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

// Check for saved theme preference or default to user's system preference
const currentTheme =
  localStorage.getItem("theme") ||
  (prefersDarkScheme.matches ? "dark" : "light");
document.documentElement.setAttribute("data-theme", currentTheme);

// Toggle theme
themeToggle.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";

  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
});

// Add member
addMemberBtn.addEventListener("click", addMember);
memberNameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addMember();
});

memberEmailInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addMember();
});

// File input change handler for custom file upload
if (expenseReceiptInput) {
  expenseReceiptInput.addEventListener("change", function (e) {
    const fileNameDisplay = document.getElementById("file-name-display");
    const file = e.target.files[0];

    if (fileNameDisplay) {
      if (file) {
        // Truncate long file names
        const fileName =
          file.name.length > 30 ? file.name.substring(0, 30) + "..." : file.name;
        fileNameDisplay.textContent = fileName;
        fileNameDisplay.style.color = "#102a43";
      } else {
        fileNameDisplay.textContent = "No file chosen";
        fileNameDisplay.style.color = "#486581";
      }
    }
  });
}

// function addMember() {
//   const name = memberNameInput.value.trim();
//   const email = memberEmailInput.value.trim();

//   if (!name || !email) {
//     alert("Please enter both name and email.");
//     return;
//   }

//   if (
//     members.some(
//       (m) =>
//         m.name.toLowerCase() === name.toLowerCase() ||
//         m.email.toLowerCase() === email.toLowerCase()
//     )
//   ) {
//     alert("Member with this name/email already exists!");
//     return;
//   }

//   members.push({ name, email });
//   renderMembers();

//   memberNameInput.value = "";
//   memberEmailInput.value = "";
//   memberNameInput.focus();
// }

async function addMember() {
  console.log("Adding member... CALLED");
  const name = memberNameInput.value.trim();
  const email = memberEmailInput.value.trim();
  const qrFile = memberQrInput.files[0];

  if (!name || !email) {
    alert("Please enter both name and email.");
    return;
  }

  if (
    members.some(
      (m) =>
        m.name.toLowerCase() === name.toLowerCase() ||
        m.email.toLowerCase() === email.toLowerCase()
    )
  ) {
    alert("Member with this name/email already exists!");
    return;
  }

  let qrCodeUrl = "";
  if (qrFile) {
    const formData = new FormData();
 
    formData.append("qrCode", qrFile);
    // if (qrFile) formData.append("qrCode", qrFile);

    try {
      const res = await fetch(`${API_URL}/trips/upload/qr`, {
        method: "POST",
        body: formData,
      });
 

      if (!res.ok) throw new Error("QR upload failed");
      const data = await res.json();
      qrCodeUrl = data.url; // Cloudinary URL returned
    } catch (err) {
      console.error("❌ Error uploading QR:", err);
      alert("Failed to upload QR code, try again.");
      return;
    }
  }

  members.push({ name, email, qrCodeUrl });
  renderMembers();

  // reset inputs
  memberNameInput.value = "";
  memberEmailInput.value = "";
  memberQrInput.value = "";
  memberNameInput.focus();
}

 
function renderMembers() {
  membersList.innerHTML = "";
  members.forEach((member, index) => {
    const memberItem = document.createElement("div");
    memberItem.className = "member-item";
    memberItem.innerHTML = `

      <span class="member-name">${member.name} (${member.email})</span>
${member.qrCodeUrl ? `<img src="${member.qrCodeUrl}" alt="QR" class="qr-thumb" />` : ""}

      <div class="member-actions">
        <button class="delete-btn action-button" onclick="deleteMember(${index})">Delete</button>
      </div>
    `;
    membersList.appendChild(memberItem);
  });
}

function editMember(index) {
  const memberItem = membersList.children[index];
  const memberName = members[index].name;
  memberItem.innerHTML = `
          <input type="text" class="member-edit-input" value="${memberName}">
          <div class="member-actions">
            <button class="save-btn action-button" onclick="saveMember(${index})">Save</button>
            <button class="cancel-btn action-button" onclick="renderMembers()">Cancel</button>
          </div>
        `;
  const input = memberItem.querySelector("input");
  input.focus();
  input.select();

  // Add enter key listener
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      saveMember(index);
    }
  });
}

function saveMember(index) {
  const input = membersList.children[index].querySelector("input");
  const newName = input.value.trim();

  if (newName && !members.some((m) => m.name === newName)) {
    members[index].name = newName;
    renderMembers();
    updateExpenseSection(members);
  } else {
    alert("Member already exists!");
  }
}

function deleteMember(index) {
  if (confirm("Are you sure you want to delete this member?")) {
    members.splice(index, 1);
    renderMembers();
    updateExpenseSection(members);
  }
}

function updateExpenseSection(updatedMembers) {
  if (!expenseSection.classList.contains("hidden")) {
    groupMembers = [...updatedMembers];
    populateMembers();

    // Fix: Compare by member.name instead of whole object
    expenses = expenses.filter((expense) => {
      return (
        groupMembers.some((m) => m.name === expense.paidBy) &&
        expense.participants.every((p) =>
          groupMembers.some((m) => m.name === p.name)
        )
      );
    });

    displayExpenses();
  }
}

// Add member in expense section
expenseAddMemberBtn.addEventListener("click", addExpenseMember);
expenseMemberInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addExpenseMember();
  }
});

function addExpenseMember() {
  const name = expenseMemberInput.value.trim();
  if (name && !groupMembers.some((m) => m.name === name)) {
    const newMember = { name, email: "" }; // placeholder email
    groupMembers.push(newMember);
    members.push(newMember);
    renderExpenseMembers();
    populateMembers();
    expenseMemberInput.value = "";
  } else {
    alert("Member already exists!");
  }
  expenseMemberInput.focus();
}

function renderExpenseMembers() {
  expenseMembersList.innerHTML = "";
  groupMembers.forEach((member, index) => {
    const memberItem = document.createElement("div");
    memberItem.className = "member-item";
    memberItem.innerHTML = `
      <span class="member-name">${member.name} (${member.email})</span>
      <div class="member-actions">
        <button class="edit-btn action-button" onclick="editExpenseMember(${index})">Edit</button>
        <button class="delete-btn action-button" onclick="deleteExpenseMember(${index})">Delete</button>
      </div>
    `;
    expenseMembersList.appendChild(memberItem);
  });
}

function editExpenseMember(index) {
  const memberItem = expenseMembersList.children[index];
  const memberName = groupMembers[index];
  memberItem.innerHTML = `
          <input type="text" class="member-edit-input" value="${memberName}">
          <div class="member-actions">
            <button class="save-btn action-button" onclick="saveExpenseMember(${index})">Save</button>
            <button class="cancel-btn action-button" onclick="renderExpenseMembers()">Cancel</button>
          </div>
        `;
  const input = memberItem.querySelector("input");
  input.focus();
  input.select();

  // Add enter key listener
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      saveExpenseMember(index);
    }
  });
}

function saveExpenseMember(index) {
  const memberItem = expenseMembersList.children[index];
  const input = memberItem.querySelector("input");
  const newName = input.value.trim();
  const oldName = groupMembers[index].name;

  if (newName && !groupMembers.some((m) => m.name === newName)) {
    // Update name in both arrays
    groupMembers[index].name = newName;
    members[index].name = newName;

    expenses.forEach((expense) => {
      if (expense.paidBy === oldName) expense.paidBy = newName;
      expense.participants = expense.participants.map((p) =>
        p === oldName ? { name: newName } : p
      );
    });

    renderExpenseMembers();
    populateMembers();
    displayExpenses();

    // Add this line after successful save
    updateGroupMembersDisplay();
  } else if (groupMembers.includes(newName)) {
    alert("Member already exists!");
  }
}

function deleteExpenseMember(index) {
  const memberName = groupMembers[index].name;

  const hasExpenses = expenses.some(
    (exp) =>
      exp.paidBy === memberName ||
      exp.participants.some((p) => p.name === memberName)
  );

  if (hasExpenses) {
    alert(
      "Cannot delete member with existing expenses. Please remove their expenses first."
    );
    return;
  }

  if (confirm("Are you sure you want to delete this member?")) {
    groupMembers.splice(index, 1);
    // const memberIndex = members.indexOf(memberName);
    const memberIndex = members.findIndex((m) => m.name === memberName);

    if (memberIndex !== -1) {
      members.splice(memberIndex, 1);
    }
    renderExpenseMembers();
    populateMembers();

    // Add this line after successful delete
    updateGroupMembersDisplay();
  }
}

// Add this function to toggle the members management section
function toggleMembersManagement(show) {
  if (show) {
    membersManagement.classList.remove("hidden");
    editGroupBtn.classList.add("hidden");
  } else {
    membersManagement.classList.add("hidden");
    editGroupBtn.classList.remove("hidden");
  }
}

// Add click event listener for the Edit Group button
editGroupBtn.addEventListener("click", () => toggleMembersManagement(true));

function editExpense(index) {
  const expense = expenses[index];
  const expenseDiv = expensesListDiv.children[index];

  // Create edit form
  const editForm = document.createElement("div");
  editForm.className = "expense-edit-form";
  editForm.innerHTML = `
          <label>Paid By:</label>
          <select class="edit-paid-by">
            ${groupMembers
              .map(
                (member) => `
              <option value="${member.name}" ${
                  member.name === expense.paidBy ? "selected" : ""
                }>
                ${member.name}
              </option>
            `
              )
              .join("")}
          </select>

          <label>Amount:</label>
          <input type="number" class="edit-amount" value="${
            expense.amount
          }" step="0.01">

          <label>Description:</label>
          <input type="text" class="edit-description" value="${
            expense.description || ""
          }">

          <label>Participants:</label>
          <div class="checkbox-group">
            ${groupMembers
              .map(
                (member) => `
              <label>
                <input type="checkbox" value="${member.name}" 
                  ${
                    expense.participants.some((p) => p.name === member.name)
                      ? "checked"
                      : ""
                  }>
                ${member.name}
              </label>
            `
              )
              .join("")}
          </div>

          <div class="expense-actions">
            <button class="save-btn action-button" onclick="saveExpenseEdit(${index})">Save</button>
            <button class="cancel-btn action-button" onclick="displayExpenses()">Cancel</button>
          </div>
        `;

  // Replace expense display with edit form
  expenseDiv.innerHTML = `
          <strong>${expense.description || "Expense " + (index + 1)}</strong>
          ${editForm.outerHTML}
        `;

  // Add enter key listeners for expense editing
  const amountInput = expenseDiv.querySelector(".edit-amount");
  const descriptionInput = expenseDiv.querySelector(".edit-description");

  [amountInput, descriptionInput].forEach((input) => {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        saveExpenseEdit(index);
      }
    });
  });
}

async function saveExpenseEdit(index) {
  const expenseDiv = expensesListDiv.children[index];
  const editForm = expenseDiv.querySelector(".expense-edit-form");

  const paidBy = editForm.querySelector(".edit-paid-by").value;
  const amount = parseFloat(editForm.querySelector(".edit-amount").value);
  const description = editForm.querySelector(".edit-description").value.trim();

  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid amount.");
    return;
  }

  const selectedParticipants = Array.from(
    editForm.querySelectorAll('input[type="checkbox"]:checked')
  ).map((checkbox) => checkbox.value);

  if (selectedParticipants.length === 0) {
    alert("Please select at least one participant.");
    return;
  }

  // ✅ Update local array first
  expenses[index] = {
    ...expenses[index],
    paidBy,
    amount,
    description,
    participants: selectedParticipants,
  };

  // ✅ Save to backend/database
  try {
    console.log("Saving edited expense to backend...");

    const response = await fetch(`${API_URL}/trips/${tripId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        groupTitle,
        groupMembers: members.map((m) => ({
          name: m.name || m,
          email: m.email || "",
          qrCodeUrl: m.qrCodeUrl || "",
        })),
        expenses: expenses, // Send updated expenses array
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Failed to save edit:", errorText);
      throw new Error(`Server error: ${response.status}`);
    }

    const updatedTrip = await response.json();
    expenses = updatedTrip.expenses; // Sync with backend response

    console.log("✅ Expense edit saved successfully!");
    showNotification("✅ Expense updated successfully!");
  } catch (error) {
    console.error("❌ Error saving expense edit:", error);
    showNotification("❌ Failed to save changes");

    // Optionally: revert local changes if save failed
    // You could reload from backend here
    return;
  }

  // ✅ Update UI
  displayExpenses();
  updateTotalExpense();

  if (settlementsListDiv.innerHTML !== "") {
    const transactions = calculateSettlements(expenses);
    displaySettlements(transactions);
  }
}

async function deleteExpense(index) {
  if (!confirm("Are you sure you want to delete this expense?")) {
    return;
  }

  try {
    // ✅ Remove from local array
    expenses.splice(index, 1);

    // ✅ Save to backend
    console.log("Saving expense deletion to backend...");

    const response = await fetch(`${API_URL}/trips/${tripId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        groupTitle,
        groupMembers: members.map((m) => ({
          name: m.name || m,
          email: m.email || "",
          qrCodeUrl: m.qrCodeUrl || "",
        })),
        expenses: expenses, // Send updated expenses array
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Failed to delete expense:", errorText);
      throw new Error(`Server error: ${response.status}`);
    }

    const updatedTrip = await response.json();
    expenses = updatedTrip.expenses; // Sync with backend

    console.log("✅ Expense deleted successfully!");
    showNotification("✅ Expense deleted successfully!");
  } catch (error) {
    console.error("❌ Error deleting expense:", error);
    showNotification("❌ Failed to delete expense");

    // Revert local deletion if backend save failed
    // You might want to reload the trip data here
    return;
  }

  // ✅ Update UI
  displayExpenses();
  updateTotalExpense();

  if (settlementsListDiv.innerHTML !== "") {
    const transactions = calculateSettlements(expenses);
    displaySettlements(transactions);
  }
}

// Helper function to format date
function formatDate(dateString) {
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Date(dateString).toLocaleString(undefined, options);
}

// Add this function to update the members display
function updateGroupMembersDisplay() {
  groupMembersDisplay.innerHTML = groupMembers
    .map((member) => `<span class="member-chip">${member.name}</span>`)
    .join("");
}

// Extend your switchView to include Analytics
function switchView(view) {
  const expenseView = document.getElementById("expense-view");
  const lendingView = document.getElementById("lending-view");
  const analyticsView = document.getElementById("analytics-section");
  const tabs = document.querySelectorAll(".tab-button");

  tabs.forEach((tab) => tab.classList.remove("active"));

  if (view === "expense") {
    expenseView.classList.remove("hidden");
    lendingView.classList.add("hidden");
    analyticsView.classList.add("hidden");
    tabs[0].classList.add("active");
    updateTotalExpense();
  } else if (view === "lending") {
    lendingView.classList.remove("hidden");
    expenseView.classList.add("hidden");
    analyticsView.classList.add("hidden");
    tabs[1].classList.add("active");
    displayLendingBorrowing();
  } else if (view === "analytics") {
    analyticsView.classList.remove("hidden");
    expenseView.classList.add("hidden");
    lendingView.classList.add("hidden");
    tabs[2].classList.add("active");
    loadAnalytics();
  }
}

function displayLendingBorrowing() {
  const lendingList = document.getElementById("lending-list");
  const balances = calculateBalances();

  lendingList.innerHTML = "";

  Object.entries(balances).forEach(([person, amount]) => {
    const div = document.createElement("div");
    div.className = "lending-item";
    if (amount > 0) {
      div.innerHTML = `
              <span>${person}</span>
              <span class="amount-to-get">₹${amount.toFixed(2)}</span>
            `;
    } else if (amount < 0) {
      div.innerHTML = `
              <span>${person}</span>
              <span class="amount-to-pay">-₹${Math.abs(amount).toFixed(
                2
              )}</span>
            `;
    }

    if (amount !== 0) {
      lendingList.appendChild(div);
    }
  });

  // Add color coding note
  const noteDiv = document.createElement("div");
  noteDiv.className = "lending-note";
  noteDiv.innerHTML = `
          <span><span class="amount-to-get">Blue</span> is price to get</span>
          <span><span class="amount-to-pay">Red</span> is price to pay</span>
        `;
  lendingList.appendChild(noteDiv);
}

function calculateBalances() {
  const balances = {};
  groupMembers.forEach((member) => (balances[member.name] = 0));

  expenses.forEach((expense) => {
    const share = expense.amount / expense.participants.length;

    balances[expense.paidBy] += expense.amount;

    expense.participants.forEach((participant) => {
      balances[participant] -= share;
    });
  });

  return balances;
}

// Add this function to calculate and display total expense
function updateTotalExpense() {
  const totalAmount = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  const totalExpenseElement = document.getElementById("total-expense-amount");
  totalExpenseElement.textContent = `₹${totalAmount.toFixed(2)}`;
}

// Helper function for analytics - category stats
function getCategoryStats() {
  const categoryTotals = {};
  expenses.forEach(expense => {
    const category = expense.category || "General";
    categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
  });
  
  return Object.entries(categoryTotals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

// Helper function for analytics - member spending stats
function getMemberStats() {
  const memberTotals = {};
  expenses.forEach(expense => {
    const paidBy = expense.paidBy;
    memberTotals[paidBy] = (memberTotals[paidBy] || 0) + expense.amount;
  });
  
  return Object.entries(memberTotals)
    .map(([name, totalSpent]) => ({ name, totalSpent }))
    .sort((a, b) => b.totalSpent - a.totalSpent);
}

function printSettlements() {
  const transactions = calculateSettlements(expenses);
  if (transactions.length === 0) {
    alert("No settlements to print!");
    return;
  }

  const settlementDetails = document.getElementById("settlement-details");
  settlementDetails.innerHTML = "";

  // Calculate analytics data
  const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const balances = calculateBalances();
  const categoryStats = getCategoryStats();
  const memberStats = getMemberStats();
  
  // 1. Header with Trip Info and Link
  const headerDiv = document.createElement("div");
  headerDiv.innerHTML = `
    <div style="text-align: center; margin-bottom: 40px; padding: 20px; border: 2px solid #334e68; border-radius: 12px; background: #f8fafc;">
      <h1 style="color: #334e68; margin: 0 0 10px; font-size: 2.2rem;">📊 ${groupTitle}</h1>
      <h2 style="color: #486581; margin: 0 0 15px; font-size: 1.2rem;">Trip Settlement Report</h2>
      <div style="background: #334e68; color: white; padding: 8px 12px; border-radius: 6px; display: inline-block; margin: 10px 0;">
        <strong>🔗 Trip Link:</strong> ${window.location.href}
      </div>
      <div style="color: #486581; font-size: 0.9rem; margin-top: 10px;">
        Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}
      </div>
    </div>
  `;
  settlementDetails.appendChild(headerDiv);

  // 2. Trip Overview - Key Metrics
  const overviewDiv = document.createElement("div");
  overviewDiv.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
      <div style="background: #e6f3ff; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #2c5282;">
        <h3 style="margin: 0 0 8px; color: #2c5282;">💰 Total Expense</h3>
        <div style="font-size: 1.8rem; font-weight: bold; color: #2c5282;">₹${totalExpense.toFixed(2)}</div>
      </div>
      <div style="background: #f0fff4; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #38a169;">
        <h3 style="margin: 0 0 8px; color: #38a169;">👥 Group Size</h3>
        <div style="font-size: 1.8rem; font-weight: bold; color: #38a169;">${groupMembers.length} Members</div>
      </div>
      <div style="background: #fff5f5; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #e53e3e;">
        <h3 style="margin: 0 0 8px; color: #e53e3e;">💳 Total Expenses</h3>
        <div style="font-size: 1.8rem; font-weight: bold; color: #e53e3e;">${expenses.length} Items</div>
      </div>
      <div style="background: #fefceb; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #d69e2e;">
        <h3 style="margin: 0 0 8px; color: #d69e2e;">⚖️ Avg per Person</h3>
        <div style="font-size: 1.8rem; font-weight: bold; color: #d69e2e;">₹${(totalExpense / groupMembers.length).toFixed(2)}</div>
      </div>
    </div>
  `;
  settlementDetails.appendChild(overviewDiv);

  // 3. Group Members
  const membersDiv = document.createElement("div");
  membersDiv.innerHTML = `
    <div style="margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e3e8ee;">
      <h3 style="margin: 0 0 15px; color: #334e68; display: flex; align-items: center;">
        👥 Group Members (${groupMembers.length})
      </h3>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${groupMembers.map((member, index) => `
          <span style="background: #334e68; color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.9rem;">
            ${index + 1}. ${member.name}
          </span>
        `).join('')}
      </div>
    </div>
  `;
  settlementDetails.appendChild(membersDiv);

  // 4. Analytics Section
  const analyticsDiv = document.createElement("div");
  analyticsDiv.innerHTML = `
    <div style="margin-bottom: 30px;">
      <h3 style="margin: 0 0 20px; color: #334e68; display: flex; align-items: center;">
        📈 Expense Analytics
      </h3>
      
      <!-- Category Breakdown -->
      <div style="margin-bottom: 25px; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e3e8ee;">
        <h4 style="margin: 0 0 15px; color: #486581;">💰 Spending by Category</h4>
        ${categoryStats.map(cat => `
          <div style="display: flex; justify-content: space-between; align-items: center; margin: 8px 0; padding: 8px; background: white; border-radius: 4px;">
            <span style="font-weight: 600;">${cat.category}</span>
            <span style="color: #2c5282; font-weight: bold;">₹${cat.total.toFixed(2)} (${((cat.total/totalExpense)*100).toFixed(1)}%)</span>
          </div>
        `).join('')}
      </div>

      <!-- Member Spending -->
      <div style="margin-bottom: 25px; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e3e8ee;">
        <h4 style="margin: 0 0 15px; color: #486581;">👤 Individual Spending</h4>
        ${memberStats.map(member => `
          <div style="display: flex; justify-content: space-between; align-items: center; margin: 8px 0; padding: 8px; background: white; border-radius: 4px;">
            <span style="font-weight: 600;">${member.name}</span>
            <span style="color: #38a169; font-weight: bold;">₹${member.totalSpent.toFixed(2)} (${((member.totalSpent/totalExpense)*100).toFixed(1)}%)</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  settlementDetails.appendChild(analyticsDiv);

  // 5. Detailed Expense List
  const expensesDiv = document.createElement("div");
  expensesDiv.innerHTML = `
    <div style="margin-bottom: 30px;">
      <h3 style="margin: 0 0 20px; color: #334e68; display: flex; align-items: center;">
        🧾 Detailed Expense List
      </h3>
      <div style="background: #f8fafc; border-radius: 8px; border: 1px solid #e3e8ee; overflow: hidden;">
        <div style="background: #334e68; color: white; padding: 12px; font-weight: bold; display: grid; grid-template-columns: 2fr 1fr 1fr 2fr 1fr; gap: 10px; font-size: 0.9rem;">
          <span>Description</span>
          <span>Amount</span>
          <span>Paid By</span>
          <span>Participants</span>
          <span>Date</span>
        </div>
        ${expenses.map((expense, index) => `
          <div style="padding: 12px; border-bottom: 1px solid #e3e8ee; display: grid; grid-template-columns: 2fr 1fr 1fr 2fr 1fr; gap: 10px; font-size: 0.85rem; ${index % 2 === 0 ? 'background: white;' : 'background: #f8fafc;'}">
            <span style="font-weight: 600;">${expense.description || "Unnamed Expense"}</span>
            <span style="color: #2c5282; font-weight: bold;">₹${expense.amount.toFixed(2)}</span>
            <span>${expense.paidBy}</span>
            <span style="font-size: 0.8rem;">${expense.participants.map(p => p).join(", ")}</span>
            <span style="color: #666;">${formatDate(expense.timestamp).split(' ')[0]}</span>
          </div>
        `).join('')}
        <div style="background: #334e68; color: white; padding: 12px; text-align: right; font-weight: bold;">
          Total: ₹${totalExpense.toFixed(2)}
        </div>
      </div>
    </div>
  `;
  settlementDetails.appendChild(expensesDiv);

  // 6. Individual Balance Analysis
  const balancesDiv = document.createElement("div");
  balancesDiv.innerHTML = `
    <div style="margin-bottom: 30px;">
      <h3 style="margin: 0 0 20px; color: #334e68; display: flex; align-items: center;">
        ⚖️ Individual Balance Analysis
      </h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
        ${Object.entries(balances).map(([person, amount]) => `
          <div style="padding: 15px; border-radius: 8px; border: 2px solid ${amount > 0 ? '#38a169' : amount < 0 ? '#e53e3e' : '#d69e2e'}; background: ${amount > 0 ? '#f0fff4' : amount < 0 ? '#fff5f5' : '#fefceb'};">
            <div style="font-weight: bold; margin-bottom: 8px;">${person}</div>
            ${amount > 0 
              ? `<div style="color: #38a169; font-weight: bold; font-size: 1.1rem;">💰 Gets back ₹${amount.toFixed(2)}</div>`
              : amount < 0 
              ? `<div style="color: #e53e3e; font-weight: bold; font-size: 1.1rem;">💳 Owes ₹${Math.abs(amount).toFixed(2)}</div>`
              : `<div style="color: #d69e2e; font-weight: bold; font-size: 1.1rem;">✅ All settled</div>`
            }
          </div>
        `).join('')}
      </div>
    </div>
  `;
  settlementDetails.appendChild(balancesDiv);

  // 7. Final Settlement Instructions
  const settlementsDiv = document.createElement("div");
  settlementsDiv.innerHTML = `
    <div style="margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px;">
      <h3 style="margin: 0 0 20px; color: white; display: flex; align-items: center;">
        💸 Settlement Instructions
      </h3>
      ${transactions.length > 0 ? `
        <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px;">
          ${transactions.map((tx, index) => `
            <div style="margin: 12px 0; padding: 12px; background: rgba(255,255,255,0.9); color: #334e68; border-radius: 6px; font-weight: 600;">
              <span style="background: #e53e3e; color: white; padding: 4px 8px; border-radius: 4px; margin-right: 8px;">
                ${index + 1}
              </span>
              <strong>${tx.from}</strong> → Pay → <strong>₹${tx.amount.toFixed(2)}</strong> → to → <strong>${tx.to}</strong>
            </div>
          `).join('')}
        </div>
        <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 6px; text-align: center;">
          <strong>Total Transactions Required: ${transactions.length}</strong>
        </div>
      ` : `
        <div style="text-align: center; padding: 20px; background: rgba(255,255,255,0.1); border-radius: 8px;">
          ✅ <strong>All expenses are already settled!</strong>
        </div>
      `}
    </div>
  `;
  settlementDetails.appendChild(settlementsDiv);

  // 8. Footer
  const footerDiv = document.createElement("div");
  footerDiv.innerHTML = `
    <div style="margin-top: 40px; padding: 20px; text-align: center; border-top: 2px solid #e3e8ee; color: #666;">
      <div style="margin-bottom: 10px;">
        <strong>📱 BillBuddies</strong> - Smart Expense Splitting
      </div>
      <div style="font-size: 0.9rem;">
        This report contains all expense details and settlement instructions for your trip.
      </div>
      <div style="font-size: 0.8rem; margin-top: 10px; color: #999;">
        Keep this receipt for your records. Share the trip link with group members for updates.
      </div>
    </div>
  `;
  settlementDetails.appendChild(footerDiv);

  // Trigger print
  // window.print();
  // Trigger print
// const printContents = document.getElementById("settlement-details").innerHTML;
// const originalContents = document.body.innerHTML;

// document.body.innerHTML = printContents;
// window.print();
// document.body.innerHTML = originalContents;
// window.location.reload(); // reload to restore event listeners

  // // ✅ Proper print in new window
  // const printContents = document.getElementById("settlement-details").innerHTML;
  // const printWindow = window.open("", "", "width=800,height=600");

  // printWindow.document.write(`
  //   <html>
  //     <head>
  //       <title>Trip Settlement Report</title>
  //       <style>
  //         body {
  //           font-family: Arial, sans-serif;
  //           margin: 20px;
  //           background: white;
  //           color: #333;
  //         }
  //         .amount-highlight { color: #2c5282; font-weight: bold; }
  //         /* You can copy/paste some of your app’s CSS here if needed */
  //       </style>
  //     </head>
  //     <body>
  //       ${printContents}
  //     </body>
  //   </html>
  // `);

  // printWindow.document.close();
  // printWindow.focus();
  // printWindow.print();
  // printWindow.close();
//   const printContents = document.getElementById("settlement-details").innerHTML;
// const printWindow = window.open("", "", "width=800,height=600");

// printWindow.document.write(`
//   <html>
//     <head>
//       <title>Trip Settlement Report</title>
//       <meta name="viewport" content="width=device-width, initial-scale=1.0">
//       <style>
//         @page { size: A4; margin: 20mm; }
//         body {
//           font-family: Arial, sans-serif;
//           margin: 20px;
//           background: #fff !important;
//           color: #333;
//         }
//         .amount-highlight { color: #2c5282; font-weight: bold; }
//       </style>
//     </head>
//     <body>
//       ${printContents}
//     </body>
//   </html>
// `);

// printWindow.document.close();
// printWindow.focus();
// printWindow.print();
// printWindow.close();
// NEW CODE
const printContents = settlementDetails.innerHTML;
const printFrame = document.createElement("iframe");
printFrame.style.position = "absolute";
printFrame.style.width = "0";
printFrame.style.height = "0";
printFrame.style.border = "none";
document.body.appendChild(printFrame);

const doc = printFrame.contentWindow.document;
doc.open();
doc.write(`
  <html>
    <head>
      <title>Trip Settlement Report</title>
      <style>
        @page { size: A4; margin: 20mm; }
        body { background: #fff; font-family: Arial, sans-serif; color: #333; }
      </style>
    </head>
    <body>${printContents}</body>
  </html>
`);
doc.close();

printFrame.contentWindow.focus();
printFrame.contentWindow.print();

// cleanup
setTimeout(() => document.body.removeChild(printFrame), 1000);



}

// Add function to save trip data
async function saveTripData() {
  if (!tripId) return;

  try {
    await fetch(`${API_URL}/trips/${tripId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        groupTitle,
        // groupMembers,
        // groupMembers: members, // now includes {name, email,qr}
        groupMembers: members.map((m) => ({
          name: m.name,
          email: m.email || "",
          qrCodeUrl: m.qrCodeUrl || "",
        })),

        expenses,
      }),
    });
  } catch (error) {
    console.error("Error saving trip data:", error);
  }
}

// Add function to load trip data

async function loadTripData(id) {
  try {
    console.log("Loading trip data for ID:", id); // Debug log
    const response = await fetch(`${API_URL}/trips/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const trip = await response.json();
    console.log("Trip data loaded:", trip); // Debug log

    groupTitle = trip.groupTitle;
    groupMembers = trip.groupMembers;
    members = [...trip.groupMembers]; // ✅ Fix: Also update the members array

    expenses = trip.expenses || [];

    // Check if DOM elements exist before using them
    if (groupTitleDisplay) {
      groupTitleDisplay.textContent = groupTitle;
    } else {
      console.error("groupTitleDisplay element not found!");
    }

    updateGroupMembersDisplay();

    // Check if renderMembers function exists
    if (typeof renderMembers === "function") {
      renderMembers(); // ✅ Fix: Update the members display in the form
    } else {
      console.error("renderMembers function not found!");
    }

    populateMembers();
    displayExpenses();
    updateTotalExpense();

    // ✅ Load settlements if present
    if (trip.settlements && trip.settlements.length > 0) {
      displaySettlements(trip.settlements);
    } else {
      if (settlementsListDiv) {
        settlementsListDiv.innerHTML = "No settlements yet.";
      }
    }

    // Check if DOM elements exist before using them
    if (groupSection && expenseSection) {
      groupSection.classList.add("hidden");
      expenseSection.classList.remove("hidden");
    } else {
      console.error("Group or expense section elements not found!");
    }

    console.log("Trip loaded successfully!"); // Debug log
  } catch (error) {
    console.error("Error loading trip:", error); // Debug log
    alert("Error loading trip data: " + error.message);
  }
}

function checkForTripId() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("trip");
  const status = urlParams.get("status"); // 👈 get status=paid
  console.log("Checking for trip ID in URL:", id);

  if (id) {
    tripId = id;
    loadTripData(id);

    // 👇 Show toast if redirected from email
    if (status === "paid") {
      showNotification("✅ Settlement marked as paid!");

      // Remove status=paid from URL after showing toast
      urlParams.delete("status");
      const cleanUrl =
        window.location.origin +
        window.location.pathname +
        "?" +
        urlParams.toString();
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }
}

// Call checkForTripId when page loads
window.addEventListener("load", () => {
  setTimeout(checkForTripId, 100); // Small delay to ensure DOM is ready
});

// Also try when DOM is ready (in case load event already fired)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(checkForTripId, 100);
  });
} else {
  // DOM is already ready
  setTimeout(checkForTripId, 100);
}

// Add copy link button to the UI
// const copyLinkBtn = document.createElement('button');
const copyLinkBtn = document.getElementById("copy-link-btn");

copyLinkBtn.onclick = () => {
  const url = window.location.href;
  navigator.clipboard.writeText(url);
  // alert("Link copied to clipboard!");
};

// Add the button after expense section is shown
createGroupBtn.addEventListener("click", () => {
  // ... existing code ...
  // expenseSection.appendChild(copyLinkBtn);
});
let memberChart, categoryChart;

async function loadAnalytics() {
  if (!tripId) return;

  try {
    // Fetch stats
    const summaryRes = await fetch(`${API_URL}/trips/${tripId}/stats/summary`);
    const summaryData = await summaryRes.json();

    const categoryRes = await fetch(
      `${API_URL}/trips/${tripId}/stats/categories`
    );
    const categoryData = await categoryRes.json();
    console.log("Summary data:", summaryData);
    console.log("Category data:", categoryData);

    // Destroy old charts if they exist
    if (memberChart) memberChart.destroy();
    if (categoryChart) categoryChart.destroy();

    // 📊 Member Spending (Bar Chart)
    const memberCtx = document.getElementById("memberChart").getContext("2d");
    memberChart = new Chart(memberCtx, {
      type: "bar",
      data: {
        labels: summaryData.map((d) => d.member),
        datasets: [
          {
            label: "Total Spent",
            data: summaryData.map((d) => d.totalSpent),
            backgroundColor: "#4299e1",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
      },
    });

    // 📊 Category Breakdown (Pie Chart)
    const categoryCtx = document
      .getElementById("categoryChart")
      .getContext("2d");
    categoryChart = new Chart(categoryCtx, {
      type: "pie",
      data: {
        labels: categoryData.map((d) => d.category || "General"),
        datasets: [
          {
            data: categoryData.map((d) => d.total),
            backgroundColor: [
              "#3182ce",
              "#38a169",
              "#e53e3e",
              "#d69e2e",
              "#805ad5",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
        },
      },
    });
  } catch (err) {
    console.error("Error loading analytics:", err);
  }
}

// ...existing code...

// Share Link Button Functionality - Wait for DOM to be ready
function initShareLinkButton() {
  const shareButton = document.getElementById("copy-link-btn");
  if (shareButton) {
    shareButton.addEventListener("click", function () {
      const currentUrl = window.location.href;

      // Try to copy to clipboard
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(currentUrl)
          .then(() => {
            showNotification("Link copied to clipboard!");
          })
          .catch(() => {
            fallbackCopyTextToClipboard(currentUrl);
          });
      } else {
        fallbackCopyTextToClipboard(currentUrl);
      }
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initShareLinkButton);
} else {
  initShareLinkButton();
}

// Fallback for older browsers
function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    if (successful) {
      showNotification("Link copied to clipboard!");
    } else {
      showNotification("Failed to copy link");
    }
  } catch (err) {
    showNotification("Failed to copy link");
  }

  document.body.removeChild(textArea);
}

// Simple notification function
function showNotification(message) {
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 1000;
        transition: opacity 0.3s;
    `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 2000);
}

// Debug function - can be called from browser console
window.testTripLoad = function (tripId) {
  console.log("Manual trip load test for:", tripId);
  loadTripData(tripId);
};

// Debug function - can be called from browser console
window.testShareLink = function () {
  console.log("Manual share link test");
  const shareButton = document.getElementById("copy-link-btn");
  if (shareButton) {
    shareButton.click();
  } else {
    console.error("Share button not found!");
  }
};

// const memberQrInput = document.getElementById("member-qr-input");
// const fileNameSpan = document.getElementById("file-name");

memberQrInput.addEventListener("change", () => {
  fileNameSpan.textContent = memberQrInput.files[0]
    ? memberQrInput.files[0].name
    : "No file chosen";
});
