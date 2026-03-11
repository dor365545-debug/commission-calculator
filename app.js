const BASE_RULES = [
  { min: 0, max: 18, europe: 2.0, america: 3.3, maxDays: 180 },
  { min: 19, max: 60, europe: 2.2, america: 3.3, maxDays: 180 },
  { min: 61, max: 65, europe: 3.8, america: 6.1, maxDays: 120 },
  { min: 66, max: 70, europe: 5.0, america: 9.0, maxDays: 120 },
  { min: 71, max: 75, europe: 6.55, america: 15.0, maxDays: 120 },
  { min: 76, max: 80, europe: 11.6, america: 28.0, maxDays: 60 },
  { min: 81, max: 85, europe: 11.6, america: 28.0, maxDays: 30 },
  { min: 86, max: 90, europe: 24.57, america: 33.0, maxDays: 30 }
];

const DAILY_ADDONS = {
  luggage: { label: "כבודה", rate: 0.5 },
  extremeSport: { label: "ספורט אתגרי", rate: 0.5 },
  winterSport: { label: "ספורט חורף", rate: 10 },
  phoneTheft: { label: "גניבת טלפון", rate: 1 },
  cameraTheft: { label: "גניבת מצלמה", rate: 1 },
  laptopTheft: { label: "גניבת מחשב/טאבלט", rate: 0.8 }
};

const form = document.getElementById("calculatorForm");
const messageBox = document.getElementById("messageBox");
const resultBox = document.getElementById("resultBox");
const resultLines = document.getElementById("resultLines");
const copyBtn = document.getElementById("copyBtn");
const ageInput = document.getElementById("age");
const pregnancyCheckbox = document.getElementById("pregnancy");

let latestSummary = "";

const formatUsd = (num) => `${num.toFixed(2)}$`;

const setMessage = (text, type = "error") => {
  messageBox.textContent = text;
  messageBox.classList.toggle("success", type === "success");
};

const getAgeRule = (age) => BASE_RULES.find((rule) => age >= rule.min && age <= rule.max);

const clearResult = () => {
  resultBox.classList.add("hidden");
  resultLines.innerHTML = "";
  latestSummary = "";
};

const updatePregnancyAvailability = () => {
  const age = Number(ageInput.value);
  const validAge = !Number.isNaN(age) && age >= 18 && age <= 46;

  if (validAge || !ageInput.value) {
    pregnancyCheckbox.disabled = false;
    return;
  }

  if (pregnancyCheckbox.checked) {
    pregnancyCheckbox.checked = false;
  }
  pregnancyCheckbox.disabled = true;
  setMessage("הרחבת הריון זמינה רק לגילאים 18 עד 46.");
};

ageInput.addEventListener("input", updatePregnancyAvailability);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  setMessage("");
  clearResult();

  const departureValue = document.getElementById("departureDate").value;
  const returnValue = document.getElementById("returnDate").value;
  const age = Number(ageInput.value);
  const destination = document.getElementById("destination").value;

  if (!departureValue || !returnValue) {
    setMessage("יש לבחור תאריך יציאה ותאריך חזרה.");
    return;
  }

  if (Number.isNaN(age) || age < 0) {
    setMessage("יש להזין גיל תקין (0 ומעלה).");
    return;
  }

  if (age >= 91) {
    setMessage("הגיל מחייב חיתום רפואי, לא ניתן לחשב אוטומטית.");
    return;
  }

  const departureDate = new Date(departureValue);
  const returnDate = new Date(returnValue);

  if (returnDate < departureDate) {
    setMessage("תאריך חזרה לא יכול להיות לפני תאריך יציאה.");
    return;
  }

  const dayMs = 1000 * 60 * 60 * 24;
  const days = Math.floor((returnDate - departureDate) / dayMs) + 1;

  const ageRule = getAgeRule(age);
  if (!ageRule) {
    setMessage("לא נמצאה טבלת מחיר מתאימה לגיל זה.");
    return;
  }

  if (days > ageRule.maxDays) {
    setMessage(`תקופת הביטוח המקסימלית לגיל זה היא ${ageRule.maxDays} ימים.`);
    return;
  }

  if (pregnancyCheckbox.checked && (age < 18 || age > 46)) {
    setMessage("הרחבת הריון זמינה רק לגילאים 18 עד 46.");
    return;
  }

  const baseDaily = destination === "america" ? ageRule.america : ageRule.europe;
  const baseTotal = baseDaily * days;

  const extensionLines = [];
  let extensionsTotal = 0;

  Object.entries(DAILY_ADDONS).forEach(([key, addon]) => {
    const checked = form.querySelector(`input[value='${key}']`)?.checked;
    if (!checked) return;

    const cost = addon.rate * days;
    extensionsTotal += cost;
    extensionLines.push(`${addon.label}: ${formatUsd(cost)} (${formatUsd(addon.rate)} × ${days} ימים)`);
  });

  const tripCancelChecked = form.querySelector("input[value='tripCancel']")?.checked;
  if (tripCancelChecked) {
    const rate = age <= 60 ? 0.7 : 0.8;
    const cap = age <= 60 ? 21 : 24;
    const cost = Math.min(days * rate, cap);
    extensionsTotal += cost;
    extensionLines.push(`ביטול/קיצור נסיעה: ${formatUsd(cost)} (תקרה ${formatUsd(cap)})`);
  }

  const competitiveSportChecked = form.querySelector("input[value='competitiveSport']")?.checked;
  if (competitiveSportChecked) {
    extensionsTotal += 25;
    extensionLines.push("ספורט תחרותי: 25.00$ (קבוע לכל התקופה)");
  }

  const preExistingChecked = form.querySelector("input[value='preExisting']")?.checked;
  if (preExistingChecked) {
    let preExistingDailyRate = 0;

    if (age <= 60) preExistingDailyRate = 4;
    else if (age <= 70) preExistingDailyRate = 6;
    else if (age <= 75) preExistingDailyRate = 9;
    else if (age <= 90) preExistingDailyRate = 15;

    const cost = preExistingDailyRate * days;
    extensionsTotal += cost;
    extensionLines.push(`מצב רפואי קודם: ${formatUsd(cost)} (${formatUsd(preExistingDailyRate)} × ${days} ימים)`);
  }

  const pregnancyChecked = pregnancyCheckbox.checked;
  if (pregnancyChecked) {
    const cost = 4 * days;
    extensionsTotal += cost;
    extensionLines.push(`הריון: ${formatUsd(cost)} (4.00$ × ${days} ימים)`);
  }

  const total = baseTotal + extensionsTotal;

  const rows = [
    `מספר ימים: ${days}`,
    `פרמיה בסיסית: ${formatUsd(baseTotal)} (${formatUsd(baseDaily)} ליום)`,
    ...extensionLines,
    `סה״כ לתשלום: ${formatUsd(total)}`
  ];

  rows.forEach((line, index) => {
    const li = document.createElement("li");
    li.textContent = line;
    if (index === rows.length - 1) li.classList.add("total");
    resultLines.appendChild(li);
  });

  latestSummary = rows.join("\n");
  resultBox.classList.remove("hidden");
  setMessage("החישוב בוצע בהצלחה.", "success");
});

copyBtn.addEventListener("click", async () => {
  if (!latestSummary) {
    setMessage("אין פירוט להעתקה. יש לחשב מחיר קודם.");
    return;
  }

  try {
    await navigator.clipboard.writeText(latestSummary);
    setMessage("הפירוט הועתק ללוח.", "success");
  } catch (error) {
    const helper = document.createElement("textarea");
    helper.value = latestSummary;
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    document.body.removeChild(helper);
    setMessage("הפירוט הועתק ללוח.", "success");
  }
});
