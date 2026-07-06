import { apiClient } from "../client";
import { getAuthToken } from "../setAuthToken";

/**
 * Invoices & receipts + expenses API. Mirrors the .NET
 * InvoicesController / ExpensesController; envelope-unwrapped here so
 * screens deal in plain shapes.
 */

// ── Types ───────────────────────────────────────────────────────────

export type DocumentKind = "invoice" | "receipt";

export interface InvoiceListItem {
  id: string;
  kind: DocumentKind;
  reference: string;
  customerName: string;
  amount: number;
  status: "pending" | "paid" | "cancelled" | "failed";
  itemCount: number;
  issuedAtUtc: string;
  dueDateUtc: string | null;
  receiptId: string | null;
  receiptReference: string | null;
  recordedToIncome: boolean;
}

export interface InvoiceDetail extends Omit<InvoiceListItem, "itemCount"> {
  customerPhone: string | null;
  customerEmail: string | null;
  items: {
    catalogItemId: string | null;
    itemName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  notes: string | null;
  sourceInvoiceReference: string | null;
}

export interface CreateInvoicePayload {
  kind: DocumentKind;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  items: { catalogItemId: string; quantity: number; unitPrice?: number | null }[];
  discount: number;
  dueDateUtc?: string | null;
  notes?: string | null;
  recordToIncome?: boolean;
}

export interface ExpenseItem {
  id: string;
  title: string;
  category: string;
  amount: number;
  expenseDateUtc: string;
  notes: string | null;
}

export interface ExpenseSummary {
  totalThisMonth: number;
  totalLastMonth: number;
  byCategoryThisMonth: { category: string; total: number; count: number }[];
}

export const EXPENSE_CATEGORIES: { key: string; label: string }[] = [
  { key: "stock", label: "Stock" },
  { key: "delivery", label: "Delivery" },
  { key: "marketing", label: "Marketing" },
  { key: "packaging", label: "Packaging" },
  { key: "rent", label: "Rent" },
  { key: "utilities", label: "Utilities" },
  { key: "data_airtime", label: "Data & airtime" },
  { key: "salaries", label: "Salaries" },
  { key: "equipment", label: "Equipment" },
  { key: "other", label: "Other" },
];

export const expenseCategoryLabel = (key: string): string =>
  EXPENSE_CATEGORIES.find((c) => c.key === key)?.label ?? "Other";

// ── Invoices ────────────────────────────────────────────────────────

export const getInvoices = async (params: {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  kind?: string;
}): Promise<{ data: InvoiceListItem[]; totalCount: number }> => {
  const response = await apiClient.get<{
    data: InvoiceListItem[];
    totalCount: number | null;
  }>("/invoices", { params });
  return {
    data: response.data?.data ?? [],
    totalCount: response.data?.totalCount ?? 0,
  };
};

export const createInvoiceDocument = async (
  payload: CreateInvoicePayload
): Promise<{ document: InvoiceDetail; message: string | null }> => {
  const response = await apiClient.post<{
    code: string;
    message: string | null;
    data: InvoiceDetail;
  }>("/invoices", payload);
  return { document: response.data.data, message: response.data.message };
};

export const generateReceipt = async (
  invoiceId: string,
  recordToIncome: boolean
): Promise<{ document: InvoiceDetail; message: string | null }> => {
  const response = await apiClient.post<{
    code: string;
    message: string | null;
    data: InvoiceDetail;
  }>(`/invoices/${invoiceId}/receipt`, { recordToIncome });
  return { document: response.data.data, message: response.data.message };
};

export const recordReceiptIncome = async (
  receiptId: string
): Promise<{ document: InvoiceDetail; message: string | null }> => {
  const response = await apiClient.post<{
    code: string;
    message: string | null;
    data: InvoiceDetail;
  }>(`/invoices/${receiptId}/record-income`);
  return { document: response.data.data, message: response.data.message };
};

export const deleteInvoiceDocument = async (id: string): Promise<void> => {
  await apiClient.delete(`/invoices/${id}`);
};

/**
 * Browser-openable PDF URL. Downloads open in the device browser, which
 * can't set an Authorization header — the backend accepts
 * `?access_token=` for invoice/receipt PDF paths specifically (same
 * pattern as report downloads).
 */
export const invoicePdfUrl = (id: string): string => {
  const base = apiClient.defaults.baseURL ?? "";
  const token = getAuthToken() ?? "";
  return `${base}/invoices/${id}/pdf?access_token=${encodeURIComponent(token)}`;
};

// ── Expenses ────────────────────────────────────────────────────────

export const getExpenses = async (params: {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  category?: string;
}): Promise<{ data: ExpenseItem[]; totalCount: number }> => {
  const response = await apiClient.get<{
    data: ExpenseItem[];
    totalCount: number | null;
  }>("/expenses", { params });
  return {
    data: response.data?.data ?? [],
    totalCount: response.data?.totalCount ?? 0,
  };
};

export const getExpenseSummary = async (): Promise<ExpenseSummary> => {
  const response = await apiClient.get<{ data: ExpenseSummary }>(
    "/expenses/summary"
  );
  return response.data.data;
};

export const createExpense = async (payload: {
  title: string;
  category: string;
  amount: number;
  expenseDate?: string | null;
  notes?: string | null;
}): Promise<ExpenseItem> => {
  const response = await apiClient.post<{ data: ExpenseItem }>(
    "/expenses",
    payload
  );
  return response.data.data;
};

export const updateExpense = async (
  id: string,
  payload: {
    title: string;
    category: string;
    amount: number;
    expenseDate?: string | null;
    notes?: string | null;
  }
): Promise<ExpenseItem> => {
  const response = await apiClient.put<{ data: ExpenseItem }>(
    `/expenses/${id}`,
    payload
  );
  return response.data.data;
};

export const deleteExpense = async (id: string): Promise<void> => {
  await apiClient.delete(`/expenses/${id}`);
};
