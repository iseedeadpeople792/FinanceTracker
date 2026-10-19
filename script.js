
"use strict";

const STORAGE_KEY = "financeTracker.transactions.v1";

const form = document.querySelector("#transaction-form");
const titleInput = document.querySelector("#title");
const amountInput = document.querySelector("#amount");
const categoryInput = document.querySelector("#category");
const dateInput = document.querySelector("#date");
const noteInput = document.querySelector("#note");

const balanceValue = document.querySelector("#balance-value");
const incomeValue = document.querySelector("#income-value");
const expenseValue = document.querySelector("#expense-value");
const balanceProgress = document.querySelector("#balance-progress");

const transactionList = document.querySelector("#transaction-list");
const transactionCount = document.querySelector("#transaction-count");
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const formMessage = document.querySelector("#form-message");

const searchInput = document.querySelector("#search-input");
const typeFilter = document.querySelector("#type-filter");
const categoryFilter = document.querySelector("#category-filter");
const clearFiltersButton = document.querySelector("#clear-filters");

const todayDate = document.querySelector("#today-date");

const currencyFormatter = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
});

const allowedTypes = ["income", "expense"];

const allowedCategories = [
    "Еда",
    "Транспорт",
    "Покупки",
    "Жильё",
    "Здоровье",
    "Развлечения",
    "Зарплата",
    "Подработка",
    "Подарок",
    "Другое"
];

let transactions = loadTransactions();

function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatMoney(amount) {
    return currencyFormatter.format(amount);
}

function formatDate(dateString) {
    const parts = dateString.split("-").map(Number);

    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return dateString;
    }

    const [year, month, day] = parts;
    return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

function createId() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isValidDate(dateString) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return false;
    }

    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

function isValidTransaction(item) {
    return (
        item !== null &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        item.id.length > 0 &&
        allowedTypes.includes(item.type) &&
        typeof item.title === "string" &&
        item.title.trim().length > 0 &&
        Number.isFinite(item.amount) &&
        item.amount > 0 &&
        item.amount <= 1_000_000_000 &&
        allowedCategories.includes(item.category) &&
        typeof item.date === "string" &&
        isValidDate(item.date) &&
        typeof item.note === "string"
    );
}

function loadTransactions() {
    try {
        const storedData = localStorage.getItem(STORAGE_KEY);

        if (!storedData) {
            return [];
        }

        const parsedData = JSON.parse(storedData);

        if (!Array.isArray(parsedData)) {
            return [];
        }

        return parsedData.filter(isValidTransaction);
    } catch (error) {
        console.error("Не удалось загрузить операции:", error);
        return [];
    }
}

function saveTransactions() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(transactions)
        );

        return true;
    } catch (error) {
        console.error("Не удалось сохранить операции:", error);
        showMessage(
            "Не удалось сохранить данные. Проверь настройки хранения браузера.",
            true
        );

        return false;
    }
}

function showMessage(message, isError = false) {
    formMessage.textContent = message;
    formMessage.classList.toggle("error", isError);
}

function updateDashboard() {
    const income = transactions
        .filter(item => item.type === "income")
        .reduce((total, item) => total + item.amount, 0);

    const expenses = transactions
        .filter(item => item.type === "expense")
        .reduce((total, item) => total + item.amount, 0);

    const balance = income - expenses;
    const total = income + expenses;

    balanceValue.textContent = formatMoney(balance);
    incomeValue.textContent = formatMoney(income);
    expenseValue.textContent = formatMoney(expenses);

    balanceValue.style.color = balance < 0 ? "#d65a5a" : "";

    const progress = total > 0
        ? Math.min((income / total) * 100, 100)
        : 0;

    balanceProgress.style.width = `${progress}%`;

    const count = transactions.length;
    transactionCount.textContent = `${count} ${
        count === 1 ? "запись" :
        count >= 2 && count <= 4 ? "записи" : "записей"
    }`;
}

function getFilteredTransactions() {
    const searchTerm = searchInput.value.trim().toLocaleLowerCase("ru");
    const selectedType = typeFilter.value;
    const selectedCategory = categoryFilter.value;

    return transactions
        .filter(item => {
            const matchesSearch = (
                item.title.toLocaleLowerCase("ru").includes(searchTerm) ||
                item.category.toLocaleLowerCase("ru").includes(searchTerm) ||
                item.note.toLocaleLowerCase("ru").includes(searchTerm)
            );

            const matchesType =
                selectedType === "all" || item.type === selectedType;

            const matchesCategory =
                selectedCategory === "all" ||
                item.category === selectedCategory;

            return matchesSearch && matchesType && matchesCategory;
        })
        .sort((a, b) => {
            const byDate = b.date.localeCompare(a.date);

            if (byDate !== 0) {
                return byDate;
            }

            return b.id.localeCompare(a.id);
        });
}

function createTableCell(className, text) {
    const cell = document.createElement("td");

    if (className) {
        cell.className = className;
    }

    cell.textContent = text;
    return cell;
}

function renderTransactions() {
    const filteredTransactions = getFilteredTransactions();

    transactionList.replaceChildren();

    filteredTransactions.forEach(item => {
        const row = document.createElement("tr");

        const titleCell = document.createElement("td");

        const title = document.createElement("span");
        title.className = "transaction-title";
        title.textContent = item.title;
        titleCell.append(title);

        if (item.note) {
            const note = document.createElement("span");
            note.className = "transaction-note";
            note.textContent = item.note;
            titleCell.append(note);
        }

        const categoryCell = document.createElement("td");
        const category = document.createElement("span");
        category.className = "category-pill";
        category.textContent = item.category;
        categoryCell.append(category);

        const dateCell = createTableCell("", formatDate(item.date));

        const amountCell = document.createElement("td");
        const amount = document.createElement("span");
        amount.className = `amount ${item.type}`;

        const sign = item.type === "income" ? "+" : "−";
        amount.textContent = `${sign}${formatMoney(item.amount)}`;
        amountCell.append(amount);

        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "×";
        deleteButton.setAttribute(
            "aria-label",
            `Удалить операцию: ${item.title}`
        );
        deleteButton.title = "Удалить операцию";

        deleteButton.addEventListener("click", () => {
            deleteTransaction(item.id);
        });

        actionCell.append(deleteButton);

        row.append(
            titleCell,
            categoryCell,
            dateCell,
            amountCell,
            actionCell
        );

        transactionList.append(row);
    });

    const hasTransactions = transactions.length > 0;
    const hasResults = filteredTransactions.length > 0;

    emptyState.classList.toggle("visible", !hasResults);

    if (!hasTransactions) {
        emptyState.querySelector("h3").textContent = "Пока нет операций";
        emptyState.querySelector("p").textContent =
            "Добавь первую запись, и она появится здесь.";
    } else if (!hasResults) {
        emptyState.querySelector("h3").textContent = "Ничего не найдено";
        emptyState.querySelector("p").textContent =
            "Попробуй изменить поисковый запрос или фильтры.";
    }

    resultCount.textContent =
        `Показано ${filteredTransactions.length} из ${transactions.length} операций`;
}

function refreshUI() {
    updateDashboard();
    renderTransactions();
}

function deleteTransaction(id) {
    const transaction = transactions.find(item => item.id === id);

    if (!transaction) {
        return;
    }

    const confirmed = window.confirm(
        `Удалить операцию «${transaction.title}»?`
    );

    if (!confirmed) {
        return;
    }

    const previousTransactions = transactions;

    transactions = transactions.filter(item => item.id !== id);

    if (!saveTransactions()) {
        transactions = previousTransactions;
        return;
    }

    refreshUI();
    showMessage("Операция удалена.");
}

form.addEventListener("submit", event => {
    event.preventDefault();

    const formData = new FormData(form);

    const type = formData.get("type");
    const title = String(formData.get("title") || "").trim();
    const amount = Number(formData.get("amount"));
    const category = String(formData.get("category") || "");
    const date = String(formData.get("date") || "");
    const note = String(formData.get("note") || "").trim();

    if (!allowedTypes.includes(type)) {
        showMessage("Выбери тип операции.", true);
        return;
    }

    if (!title || title.length > 70) {
        showMessage("Введи название операции до 70 символов.", true);
        titleInput.focus();
        return;
    }

    if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > 1_000_000_000
    ) {
        showMessage("Укажи корректную сумму больше нуля.", true);
        amountInput.focus();
        return;
    }

    if (!allowedCategories.includes(category)) {
        showMessage("Выбери категорию из списка.", true);
        return;
    }

    if (!isValidDate(date)) {
        showMessage("Укажи корректную дату.", true);
        dateInput.focus();
        return;
    }

    if (note.length > 150) {
        showMessage("Комментарий должен быть не длиннее 150 символов.", true);
        noteInput.focus();
        return;
    }

    const transaction = {
        id: createId(),
        type,
        title,
        amount: Math.round(amount * 100) / 100,
        category,
        date,
        note
    };

    transactions.push(transaction);

    if (!saveTransactions()) {
        transactions = transactions.filter(
            item => item.id !== transaction.id
        );
        return;
    }

    form.reset();

    dateInput.value = getLocalDateString();
    document.querySelector(
        'input[name="type"][value="expense"]'
    ).checked = true;

    // Показываем только что добавленную операцию.
    searchInput.value = "";
    typeFilter.value = "all";
    categoryFilter.value = "all";

    refreshUI();
    showMessage("Операция успешно добавлена.");

    titleInput.focus();
});

searchInput.addEventListener("input", renderTransactions);
typeFilter.addEventListener("change", renderTransactions);
categoryFilter.addEventListener("change", renderTransactions);

clearFiltersButton.addEventListener("click", () => {
    searchInput.value = "";
    typeFilter.value = "all";
    categoryFilter.value = "all";

    renderTransactions();
});

todayDate.textContent = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
}).format(new Date());

dateInput.value = getLocalDateString();

refreshUI();
