import React from 'react';
import { useTranslation } from 'react-i18next';
import './ExpenseRowActions.css';

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);

const ExpenseRowActions = ({ expense, onEdit, onDelete, deleting = false }) => {
  const { t } = useTranslation();
  if (!expense || !onDelete) return null;

  const canEdit = expense.editable === true;

  return (
    <div className="expense-row-actions">
      {canEdit && onEdit && (
        <button
          type="button"
          className="expense-row-action expense-row-action--edit"
          onClick={() => onEdit(expense)}
          aria-label={t('expenseActions.edit')}
          title={t('expenseActions.edit')}
        >
          <PencilIcon />
        </button>
      )}
      <button
        type="button"
        className="expense-row-action expense-row-action--delete"
        onClick={() => onDelete(expense)}
        disabled={deleting}
        aria-label={t('expenseActions.delete')}
        title={t('expenseActions.delete')}
      >
        <TrashIcon />
      </button>
    </div>
  );
};

export default ExpenseRowActions;
