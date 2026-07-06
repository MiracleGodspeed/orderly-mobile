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
 *
 * NOTE: this carries the session JWT in the URL, so it must NEVER be the
 * link a vendor shares. Use it only as a local fallback for viewing.
 * For sharing, use `getInvoiceShareUrl` below.
 */
export const invoicePdfUrl = (id: string): string => {
  const base = apiClient.defaults.baseURL ?? "";
  const token = getAuthToken() ?? "";
  return `${base}/invoices/${id}/pdf?access_token=${encodeURIComponent(token)}`;
};

/**
 * Clean, shareable public link to a document's PDF. The backend mints a
 * short HMAC-signed token (NOT the session JWT), so the vendor can drop
 * this straight into WhatsApp and the customer opens the PDF directly —
 * no long token string, nothing sensitive, nothing login-gated.
 */
export const getInvoiceShareUrl = async (id: string): Promise<string> => {
  const response = await apiClient.get<{ data: { url: string; reference: string } }>(
    `/invoices/${id}/share-link`
  );
  const url = response.data?.data?.url;
  if (!url) throw new Error("No share URL");
  return url;
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

export interface ExpenseRangeSummary {
  total: number;
  byCategory: { category: string; total: number }[];
}

/** Total + category breakdown for an arbitrary window, so the analytics
 *  screen's expenses/profit figures follow the same period as revenue. */
export const getExpenseRangeSummary = async (
  fromIso: string,
  toIso: string
): Promise<ExpenseRangeSummary> => {
  const response = await apiClient.get<{ data: ExpenseRangeSummary }>(
    "/expenses/range-summary",
    { params: { from: fromIso, to: toIso } }
  );
  return (
    response.data?.data ?? { total: 0, byCategory: [] }
  );
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
