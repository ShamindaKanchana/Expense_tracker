const EXPENSE_CATEGORIES = Object.freeze([
  'Food',
  'Transport',
  'Entertainment',
  'Bills',
  'Shopping',
  'Construction',
  'Health',
  'Education',
  'Others'
]);

const isExpenseCategory = (value) => EXPENSE_CATEGORIES.includes(value);

module.exports = {
  EXPENSE_CATEGORIES,
  isExpenseCategory
};
