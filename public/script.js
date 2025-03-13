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
      const expenseDescriptionInput = document.getElementById(
        "expense-description"
      );
      const participantsCheckboxesDiv = document.getElementById(
        "participants-checkboxes"
      );
      const addExpenseBtn = document.getElementById("add-expense-btn");
      const expensesListDiv = document.getElementById("expenses-list");
      const calculateSettlementBtn = document.getElementById(
        "calculate-settlement-btn"
      );
      const settlementsListDiv = document.getElementById("settlements-list");

      // New member management functionality
      const memberInput = document.getElementById("member-input");
      const addMemberBtn = document.getElementById("add-member-btn");
      const membersList = document.getElementById("members-list");
      let members = [];

      // Add these new DOM references with your other DOM references
      const expenseMemberInput = document.getElementById(
        "expense-member-input"
      );
      const expenseAddMemberBtn = document.getElementById(
        "expense-add-member-btn"
      );
      const expenseMembersList = document.getElementById(
        "expense-members-list"
      );

      // Add these new DOM references with your other DOM references
      const editGroupBtn = document.getElementById("edit-group-btn");
      const membersManagement = document.getElementById("members-management");

      // Add these DOM references with your other references
      const groupTitleDisplay = document.getElementById("group-title-display");
      const groupMembersDisplay = document.getElementById(
        "group-members-display"
      );

      // Add these variables at the top
      let tripId = null;
      const API_URL = 'https://billbuddies.onrender.com/api';

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
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              groupTitle,
              groupMembers
            })
          });
          const data = await response.json();
          tripId = data.tripId;

          // Update URL with trip ID
          window.history.pushState({}, '', `?trip=${tripId}`);

          // Update UI
          groupTitleDisplay.textContent = groupTitle;
          updateGroupMembersDisplay();
          groupSection.classList.add("hidden");
          expenseSection.classList.remove("hidden");
          populateMembers();
        } catch (error) {
          alert('Error creating group: ' + error.message);
        }
      });

      // Populate members into the dropdown and checkbox list
      function populateMembers() {
        expensePaidBySelect.innerHTML = "";
        participantsCheckboxesDiv.innerHTML = "";

        groupMembers.forEach((member) => {
          // Create option for "Paid By" select element
          const option = document.createElement("option");
          option.value = member;
          option.textContent = member;
          expensePaidBySelect.appendChild(option);

          // Create checkbox for each member
          const label = document.createElement("label");
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = member;
          checkbox.checked = true;
          checkbox.id = `participant-${member}`;
          label.appendChild(checkbox);
          label.appendChild(document.createTextNode(" " + member));
          participantsCheckboxesDiv.appendChild(label);
        });

        // Add this line to update the members list display
        renderExpenseMembers();

        // Add this line to update the members display
        updateGroupMembersDisplay();
      }

      // Event listener to add an expense
      addExpenseBtn.addEventListener("click", async () => {
        const paidBy = expensePaidBySelect.value;
        const amount = parseFloat(expenseAmountInput.value);
        if (isNaN(amount) || amount <= 0) {
          alert("Please enter a valid amount.");
          return;
        }
        const description = expenseDescriptionInput.value.trim();

        // Gather selected participants from checkboxes
        const participantCheckboxes =
          participantsCheckboxesDiv.querySelectorAll('input[type="checkbox"]');
        const selectedParticipants = [];
        participantCheckboxes.forEach((checkbox) => {
          if (checkbox.checked) {
            selectedParticipants.push(checkbox.value);
          }
        });

        if (selectedParticipants.length === 0) {
          alert("Please select at least one participant.");
          return;
        }

        // Create an expense object with timestamp
        const expense = {
          paidBy,
          amount,
          participants: selectedParticipants,
          description,
          timestamp: new Date().toISOString(), // Add timestamp
        };

        // Add the expense to the list and update the display
        expenses.push(expense);
        expenseAmountInput.value = "";
        expenseDescriptionInput.value = "";
        displayExpenses();
        updateTotalExpense();

        // Save trip data after adding expense
        await saveTripData();
      });

      // Display the list of added expenses
      function displayExpenses() {
        expensesListDiv.innerHTML = "";
        if (expenses.length === 0) {
          expensesListDiv.textContent = "No expenses added yet.";
          return;
        }
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
            <br>Split between: ${expense.participants.join(", ")}
            <div class="expense-date">Added on ${formatDate(
              expense.timestamp
            )}</div>
            <div class="expense-actions">
              <button class="edit-btn action-button" onclick="editExpense(${index})">Edit</button>
              <button class="delete-btn action-button" onclick="deleteExpense(${index})">Delete</button>
            </div>
          `;
          expensesListDiv.appendChild(div);
        });
      }

      // Event listener to calculate settlement
      calculateSettlementBtn.addEventListener("click", () => {
        if (expenses.length === 0) {
          alert("No expenses to settle.");
          return;
        }

        const transactions = calculateSettlements(expenses);
        displaySettlements(transactions);
      });

      // Display the settlement transactions
      function displaySettlements(transactions) {
        settlementsListDiv.innerHTML = "";
        if (transactions.length === 0) {
          settlementsListDiv.textContent = "Everything is settled up!";
          return;
        }
        transactions.forEach((tx) => {
          const div = document.createElement("div");
          div.className = "transaction";
          div.innerHTML = `
            <strong>${tx.from}</strong> pays <strong>${tx.to}</strong>:
            <span class="amount-highlight">${groupCurrency} ${tx.amount.toFixed(
            2
          )}</span>
          `;
          settlementsListDiv.appendChild(div);
        });
      }

      /**
       * Calculate settlement transactions to balance all expenses.
       *
       * Each expense should be an object with:
       *   - paidBy: String (who paid)
       *   - amount: Number (total amount paid)
       *   - participants: Array of Strings (members who share the expense)
       *
       * Returns an array of transactions in the form:
       *   { from: debtor, to: creditor, amount: value }
       */
      function calculateSettlements(expenses) {
        // Step 1: Calculate net balances for each group member.
        const balances = {};

        // Initialize all balances to zero.
        groupMembers.forEach((member) => {
          balances[member] = 0;
        });

        expenses.forEach((expense) => {
          const { paidBy, amount, participants } = expense;
          const share = amount / participants.length;

          // Each participant owes their share.
          participants.forEach((participant) => {
            balances[participant] -= share;
          });

          // The payer receives the full amount.
          balances[paidBy] += amount;
        });

        // Round balances to avoid floating point issues.
        Object.keys(balances).forEach((member) => {
          balances[member] = parseFloat(balances[member].toFixed(2));
        });

        // Step 2: Separate members into creditors and debtors.
        const creditors = []; // Members who are owed money.
        const debtors = []; // Members who owe money.

        for (const member in balances) {
          const balance = balances[member];
          if (balance > 0.01) {
            creditors.push({ user: member, amount: balance });
          } else if (balance < -0.01) {
            debtors.push({ user: member, amount: balance });
          }
        }

        // Sort creditors (largest credit first) and debtors (most in debt first).
        creditors.sort((a, b) => b.amount - a.amount);
        debtors.sort((a, b) => a.amount - b.amount);

        // Step 3: Greedily settle debts.
        const transactions = [];
        let i = 0; // index for debtors
        let j = 0; // index for creditors

        while (i < debtors.length && j < creditors.length) {
          const debtor = debtors[i];
          const creditor = creditors[j];
          const settleAmount = Math.min(creditor.amount, -debtor.amount);

          transactions.push({
            from: debtor.user,
            to: creditor.user,
            amount: parseFloat(settleAmount.toFixed(2)),
          });

          debtor.amount += settleAmount;
          creditor.amount -= settleAmount;

          // Move to next debtor if settled.
          if (Math.abs(debtor.amount) < 1e-9) {
            i++;
          }
          // Move to next creditor if settled.
          if (Math.abs(creditor.amount) < 1e-9) {
            j++;
          }
        }

        return transactions;
      }

      // Theme toggle functionality
      const themeToggle = document.getElementById("theme-toggle");
      const prefersDarkScheme = window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

      // Check for saved theme preference or default to user's system preference
      const currentTheme =
        localStorage.getItem("theme") ||
        (prefersDarkScheme.matches ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", currentTheme);

      // Toggle theme
      themeToggle.addEventListener("click", () => {
        const currentTheme =
          document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "light" ? "dark" : "light";

        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
      });

      // Add member
      addMemberBtn.addEventListener("click", addMember);
      memberInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          addMember();
        }
      });

      function addMember() {
        const name = memberInput.value.trim();
        if (name && !members.includes(name)) {
          members.push(name);
          renderMembers();
          memberInput.value = "";
        } else if (members.includes(name)) {
          alert("Member already exists!");
        }
        memberInput.focus();
      }

      function renderMembers() {
        membersList.innerHTML = "";
        members.forEach((member, index) => {
          const memberItem = document.createElement("div");
          memberItem.className = "member-item";
          memberItem.innerHTML = `
            <span class="member-name">${member}</span>
            <div class="member-actions">
              <button class="edit-btn action-button" onclick="editMember(${index})">Edit</button>
              <button class="delete-btn action-button" onclick="deleteMember(${index})">Delete</button>
            </div>
          `;
          membersList.appendChild(memberItem);
        });
      }

      function editMember(index) {
        const memberItem = membersList.children[index];
        const memberName = members[index];
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
        const memberItem = membersList.children[index];
        const input = memberItem.querySelector("input");
        const newName = input.value.trim();

        if (newName && !members.includes(newName)) {
          members[index] = newName;
          renderMembers();
          updateExpenseSection(members);
        } else if (members.includes(newName)) {
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

      // Function to update expense section when members are modified
      function updateExpenseSection(updatedMembers) {
        if (!expenseSection.classList.contains("hidden")) {
          groupMembers = [...updatedMembers];
          populateMembers();
          // Clear existing expenses if any members were removed
          expenses = expenses.filter((expense) => {
            return (
              groupMembers.includes(expense.paidBy) &&
              expense.participants.every((p) => groupMembers.includes(p))
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
        if (name && !groupMembers.includes(name)) {
          groupMembers.push(name);
          members.push(name); // Keep both arrays in sync
          renderExpenseMembers();
          populateMembers();
          expenseMemberInput.value = "";
        } else if (groupMembers.includes(name)) {
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
            <span class="member-name">${member}</span>
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
        const oldName = groupMembers[index];

        if (newName && !groupMembers.includes(newName)) {
          // Update name in both arrays
          groupMembers[index] = newName;
          const memberIndex = members.indexOf(oldName);
          if (memberIndex !== -1) {
            members[memberIndex] = newName;
          }

          // Update expenses with the new name
          expenses.forEach((expense) => {
            if (expense.paidBy === oldName) {
              expense.paidBy = newName;
            }
            expense.participants = expense.participants.map((p) =>
              p === oldName ? newName : p
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
        const memberName = groupMembers[index];

        // Check if member has any expenses
        const hasExpenses = expenses.some(
          (expense) =>
            expense.paidBy === memberName ||
            expense.participants.includes(memberName)
        );

        if (hasExpenses) {
          alert(
            "Cannot delete member with existing expenses. Please remove their expenses first."
          );
          return;
        }

        if (confirm("Are you sure you want to delete this member?")) {
          groupMembers.splice(index, 1);
          const memberIndex = members.indexOf(memberName);
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
      editGroupBtn.addEventListener("click", () =>
        toggleMembersManagement(true)
      );

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
              <option value="${member}" ${
                  member === expense.paidBy ? "selected" : ""
                }>
                ${member}
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
                <input type="checkbox" value="${member}" 
                  ${expense.participants.includes(member) ? "checked" : ""}>
                ${member}
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

      function saveExpenseEdit(index) {
        const expenseDiv = expensesListDiv.children[index];
        const editForm = expenseDiv.querySelector(".expense-edit-form");

        const paidBy = editForm.querySelector(".edit-paid-by").value;
        const amount = parseFloat(editForm.querySelector(".edit-amount").value);
        const description = editForm
          .querySelector(".edit-description")
          .value.trim();

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

        // Update the expense while preserving the original timestamp
        expenses[index] = {
          paidBy,
          amount,
          description,
          participants: selectedParticipants,
          timestamp: expenses[index].timestamp, // Preserve original timestamp
        };

        displayExpenses();
        updateTotalExpense();
        if (settlementsListDiv.innerHTML !== "") {
          const transactions = calculateSettlements(expenses);
          displaySettlements(transactions);
        }
      }

      function deleteExpense(index) {
        if (confirm("Are you sure you want to delete this expense?")) {
          expenses.splice(index, 1);
          displayExpenses();
          updateTotalExpense();
          if (settlementsListDiv.innerHTML !== "") {
            const transactions = calculateSettlements(expenses);
            displaySettlements(transactions);
          }
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
          .map((member) => `<span class="member-chip">${member}</span>`)
          .join("");
      }

      function switchView(view) {
        const expenseView = document.getElementById("expense-view");
        const lendingView = document.getElementById("lending-view");
        const tabs = document.querySelectorAll(".tab-button");

        tabs.forEach((tab) => tab.classList.remove("active"));

        if (view === "expense") {
          expenseView.classList.remove("hidden");
          lendingView.classList.add("hidden");
          tabs[0].classList.add("active");
          updateTotalExpense();
        } else {
          lendingView.classList.remove("hidden");
          expenseView.classList.add("hidden");
          tabs[1].classList.add("active");
          displayLendingBorrowing();
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
        groupMembers.forEach((member) => (balances[member] = 0));

        expenses.forEach((expense) => {
          const share = expense.amount / expense.participants.length;

          // Add amount to payer
          balances[expense.paidBy] += expense.amount;

          // Subtract shares from participants
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
        const totalExpenseElement = document.getElementById(
          "total-expense-amount"
        );
        totalExpenseElement.textContent = `₹${totalAmount.toFixed(2)}`;
      }

      function printSettlements() {
        const transactions = calculateSettlements(expenses);
        if (transactions.length === 0) {
          alert("No settlements to print!");
          return;
        }

        const settlementDetails = document.getElementById("settlement-details");
        settlementDetails.innerHTML = "";

        // 1. Trip Name
        const titleDiv = document.createElement("div");
        titleDiv.innerHTML = `
          <h2 style="text-align: center; margin-bottom: 30px; color: #334e68;">
            ${groupTitle}
          </h2>
        `;
        settlementDetails.appendChild(titleDiv);

        // 2. Group Members
        const membersDiv = document.createElement("div");
        membersDiv.innerHTML = `
          <h3 style="margin: 20px 0 10px;">Group Members:</h3>
          <p style="margin-bottom: 20px;">${groupMembers.join(", ")}</p>
        `;
        settlementDetails.appendChild(membersDiv);

        // 3. Expense Details
        const expensesDiv = document.createElement("div");
        expensesDiv.innerHTML = `
          <h3 style="margin: 20px 0 10px;">Expense Details:</h3>
          ${expenses
            .map(
              (expense) => `
            <div style="margin: 10px 0; padding: 10px; border-bottom: 1px solid #e3e8ee;">
              <strong>${expense.description || "Unnamed Expense"}</strong><br>
              Amount: ₹${expense.amount.toFixed(2)}<br>
              Paid by: ${expense.paidBy}<br>
              Split between: ${expense.participants.join(", ")}<br>
              <small>Added on: ${formatDate(expense.timestamp)}</small>
            </div>
          `
            )
            .join("")}
          <div style="margin: 20px 0; text-align: right;">
            <strong>Total Group Expense: ₹${expenses
              .reduce((sum, exp) => sum + exp.amount, 0)
              .toFixed(2)}</strong>
          </div>
        `;
        settlementDetails.appendChild(expensesDiv);

        // 4. Lending/Borrowing Details
        const balances = calculateBalances();
        const balancesDiv = document.createElement("div");
        balancesDiv.innerHTML = `
          <h3 style="margin: 20px 0 10px;">Individual Balances:</h3>
          ${Object.entries(balances)
            .map(
              ([person, amount]) => `
            <div style="margin: 10px 0;">
              <strong>${person}:</strong> 
              ${
                amount > 0
                  ? `<span style="color: #2c5282;">Gets back ₹${amount.toFixed(
                      2
                    )}</span>`
                  : amount < 0
                  ? `<span style="color: #e53e3e;">Owes ₹${Math.abs(
                      amount
                    ).toFixed(2)}</span>`
                  : `<span>All settled (₹0.00)</span>`
              }
            </div>
          `
            )
            .join("")}
        `;
        settlementDetails.appendChild(balancesDiv);

        // 5. Settlement Details
        const settlementsDiv = document.createElement("div");
        settlementsDiv.innerHTML = `
          <h3 style="margin: 20px 0 10px;">Settlement Summary:</h3>
          ${transactions
            .map(
              (tx) => `
            <div style="margin: 10px 0;">
              <strong>${
                tx.from
              }</strong> needs to pay <strong>₹${tx.amount.toFixed(
                2
              )}</strong> to <strong>${tx.to}</strong></div>
          `
            )
            .join("")}
        `;
        settlementDetails.appendChild(settlementsDiv);

        // Footer with timestamp
        const footerDiv = document.createElement("div");
        footerDiv.className = "print-footer";
        footerDiv.innerHTML = `
          <div style="margin-top: 30px; text-align: center; color: #666;">
            Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
          </div>
        `;
        settlementDetails.appendChild(footerDiv);

        // Trigger print
        window.print();
      }

      // Add function to save trip data
      async function saveTripData() {
        if (!tripId) return;

        try {
          await fetch(`${API_URL}/trips/${tripId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              groupTitle,
              groupMembers,
              expenses
            })
          });
        } catch (error) {
          console.error('Error saving trip data:', error);
        }
      }

      // Add function to load trip data
      async function loadTripData(id) {
        try {
          const response = await fetch(`${API_URL}/trips/${id}`);
          const trip = await response.json();

          groupTitle = trip.groupTitle;
          groupMembers = trip.groupMembers;
          expenses = trip.expenses;

          groupTitleDisplay.textContent = groupTitle;
          updateGroupMembersDisplay();
          populateMembers();
          displayExpenses();
          updateTotalExpense();

          groupSection.classList.add("hidden");
          expenseSection.classList.remove("hidden");
        } catch (error) {
          alert('Error loading trip data: ' + error.message);
        }
      }

      // Add function to check for trip ID in URL
      function checkForTripId() {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('trip');
        if (id) {
          tripId = id;
          loadTripData(id);
        }
      }

      // Call checkForTripId when page loads
      window.addEventListener('load', checkForTripId);

      // Add copy link button to the UI
      // const copyLinkBtn = document.createElement('button');
      const copyLinkBtn = document.getElementById('copy-link-btn');
      
      // copyLinkBtn.className = 'copy-link-btn';
      // copyLinkBtn.innerHTML = `
      //   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      //     <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      //     <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      //   </svg>
      //   Share Trip
      // `;
      copyLinkBtn.onclick = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      };

      // Add the button after expense section is shown
      createGroupBtn.addEventListener("click", () => {
        // ... existing code ...
        // expenseSection.appendChild(copyLinkBtn);
      });
