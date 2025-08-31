// Database table interfaces matching the SQL schema

export interface Stock {
  id: number;
  name: string;
  created_at: Date;
}

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'caissier' | 'super_admin';
  stock_id: number | null;
  is_active: boolean;
  created_at: Date;
}

export interface Product {
  id: number;
  name: string;
  reference: string | null;
  description: string | null;
  price: number;
  quantity: number; // Toujours 999999 (stock illimité)
  stock_id: number;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface Barcode {
  id: number;
  product_id: number;
  code: string;
}

export interface Sale {
  id: number;
  user_id: number | null;
  stock_id: number | null;
  client_id: number | null;
  total: number;
  payment_method: 'cash' | 'card' | 'check' | 'credit';
  payment_status: 'pending' | 'partial' | 'paid';
  notes: string | null;
  created_at: Date;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface Invoice {
  id: number;
  sale_id: number | null;
  achat_id: number | null;
  invoice_number: string;
  type: 'sale' | 'purchase';
  client_id: number | null;
  fournisseur_id: number | null;
  total: number;
  payment_status: 'pending' | 'partial' | 'paid';
  due_date: Date | null;
  notes: string | null;
  created_at: Date;
}

// ============================================================================
// NEW BUSINESS ENTITIES
// ============================================================================

export interface Client {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  stock_id: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Fournisseur {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  contact_person: string | null;
  payment_terms: string;
  stock_id: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Achat {
  id: number;
  fournisseur_id: number;
  stock_id: number;
  reference: string | null;
  total: number;
  payment_method: 'cash' | 'card' | 'check' | 'credit';
  payment_status: 'pending' | 'partial' | 'paid';
  delivery_date: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AchatItem {
  id: number;
  achat_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
}



export interface Cheque {
  id: number;
  reference: string;
  amount: number;
  bank_name: string | null;
  account_number: string | null;
  issue_date: Date;
  due_date: Date;
  status: 'pending' | 'deposited' | 'cleared' | 'bounced' | 'cancelled';
  type: 'received' | 'issued';
  client_id: number | null;
  fournisseur_id: number | null;
  sale_id: number | null;
  achat_id: number | null;
  stock_id: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CaisseSession {
  id: number;
  stock_id: number;
  user_id: number;
  opening_balance: number;
  closing_balance: number | null;
  expected_balance: number | null;
  difference: number | null;
  status: 'open' | 'closed';
  opened_at: Date;
  closed_at: Date | null;
  notes: string | null;
}

export interface CaisseTransaction {
  id: number;
  session_id: number;
  type: 'sale' | 'purchase' | 'expense' | 'income' | 'opening' | 'closing';
  amount: number;
  description: string | null;
  reference_id: number | null;
  reference_type: 'sale' | 'achat' | 'reparation' | 'manual' | null;
  created_at: Date;
}

export interface ReglementCaisse {
  id: number;
  stock_id: number;
  user_id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string | null;
  payment_method: 'cash' | 'card' | 'check' | 'transfer';
  reference: string | null;
  date: Date;
  created_at: Date;
}

export interface ReglementFournisseur {
  id: number;
  fournisseur_id: number;
  achat_id: number | null;
  stock_id: number;
  amount: number;
  payment_method: 'cash' | 'card' | 'check' | 'transfer';
  reference: string | null;
  payment_date: Date;
  notes: string | null;
  created_at: Date;
}

export interface DailyProfit {
  id: number;
  stock_id: number;
  date: Date;
  total_sales: number;
  total_purchases: number;
  total_expenses: number;
  total_repairs: number;
  gross_profit: number;
  net_profit: number;
  calculated_at: Date;
}

export interface Notification {
  id: number;
  stock_id: number;
  user_id: number | null;
  type: 'low_stock' | 'cheque_due' | 'repair_ready' | 'payment_overdue' | 'system';
  title: string;
  message: string;
  reference_id: number | null;
  reference_type: string | null;
  is_read: boolean;
  priority: 'low' | 'medium' | 'high';
  created_at: Date;
}

export interface ReturnTransaction {
  id: number;
  stock_id: number;
  original_sale_id: number;
  user_id: number | null;
  client_id: number | null;
  return_type: 'refund' | 'exchange';
  total_refund_amount: number;
  total_exchange_amount: number;
  balance_adjustment: number; // positive = customer pays, negative = customer receives
  payment_method: 'cash' | 'card' | 'check' | 'credit';
  notes: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  processed_at: Date | null;
  created_at: Date;
}

export interface ReturnItem {
  id: number;
  return_transaction_id: number;
  original_sale_item_id: number | null;
  product_id: number;
  action_type: 'return' | 'exchange_out' | 'exchange_in';
  quantity: number;
  unit_price: number;
  total_amount: number;
  reason: string | null;
  condition_notes: string | null;
  created_at: Date;
}

// Frontend-specific types
export interface CartItem extends Product {
  cartQuantity: number;
}

export interface ProductWithBarcode extends Product {
  barcodes?: Barcode[];
}

export interface SaleWithItems extends Sale {
  items: SaleItemWithProduct[];
  user?: User;
  stock?: Stock;
}

export interface SaleItemWithProduct extends SaleItem {
  product: Product;
}

export interface InvoiceWithSale extends Invoice {
  sale: SaleWithItems;
}

// Enhanced frontend types with relationships
export interface ClientWithSales extends Client {
  sales?: Sale[];
  total_sales?: number;
}

export interface FournisseurWithAchats extends Fournisseur {
  achats?: Achat[];
  total_achats?: number;
  outstanding_balance?: number;
}

export interface AchatWithItems extends Achat {
  items: AchatItemWithProduct[];
  fournisseur?: Fournisseur;
}

export interface AchatItemWithProduct extends AchatItem {
  product: Product;
}

export interface SaleWithClient extends Sale {
  client?: Client;
}

export interface ReparationWithClient extends Reparation {
  client: Client;
}

export interface ReturnTransactionWithItems extends ReturnTransaction {
  items: ReturnItemWithProduct[];
  original_sale?: SaleWithItems;
  client?: Client;
  user?: User;
}

export interface ReturnItemWithProduct extends ReturnItem {
  product: Product;
  original_sale_item?: SaleItem;
}

export interface StockMovement {
  id: number;
  from_stock_id: number;
  to_stock_id: number;
  user_id: number | null;
  movement_number: string;
  recipient_name: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'claimed';
  notes: string | null;
  claim_message: string | null;
  claim_date: Date | null;
  confirmed_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface StockMovementItem {
  id: number;
  movement_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  created_at: Date;
}

export interface StockMovementWithItems extends StockMovement {
  items: StockMovementItemWithProduct[];
  from_stock?: Stock;
  to_stock?: Stock;
  user?: User;
}

export interface StockMovementItemWithProduct extends StockMovementItem {
  product: Product;
}

export interface ChequeWithRelations extends Cheque {
  client?: Client;
  fournisseur?: Fournisseur;
  sale?: Sale;
  achat?: Achat;
}

export interface CaisseSessionWithTransactions extends CaisseSession {
  transactions: CaisseTransaction[];
  user?: User;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  stockId: string;
}

export interface LoginResponse {
  user: {
    id: number;
    username: string;
    email: string;
    role: 'admin' | 'caissier' | 'super_admin';
    stock_id: number | null;
  };
  token?: string;
}

export interface CreateProductRequest {
  name: string;
  reference?: string;
  description?: string;
  price: number;
  quantity: number;
  stock_id: number;
  barcodes?: string[];
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: number;
}

// ============================================================================
// NEW API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateClientRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  stock_id: number;
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {
  id: number;
}

export interface CreateFournisseurRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  payment_terms?: string;
  stock_id: number;
}

export interface UpdateFournisseurRequest extends Partial<CreateFournisseurRequest> {
  id: number;
}

export interface CreateAchatRequest {
  fournisseur_id: number;
  stock_id: number;
  reference?: string;
  payment_method?: 'cash' | 'card' | 'check' | 'credit';
  payment_status?: 'pending' | 'partial' | 'paid';
  delivery_date?: string;
  notes?: string;
  items: {
    product_id: number;
    quantity: number;
    unit_price: number;
  }[];
}

export interface CreateReparationRequest {
  client_id: number;
  stock_id: number;
  device_type: string;
  device_brand?: string;
  device_model?: string;
  problem_description: string;
  diagnosis?: string;
  repair_cost?: number;
  parts_cost?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  estimated_completion?: string;
}

export interface UpdateReparationRequest extends Partial<CreateReparationRequest> {
  id: number;
  status?: 'received' | 'diagnosed' | 'in_progress' | 'completed' | 'delivered' | 'cancelled';
  actual_completion?: string;
  payment_status?: 'pending' | 'partial' | 'paid';
}

export interface CreateChequeRequest {
  reference: string;
  amount: number;
  bank_name?: string;
  account_number?: string;
  issue_date: string;
  due_date: string;
  type: 'received' | 'issued';
  client_id?: number;
  fournisseur_id?: number;
  sale_id?: number;
  achat_id?: number;
  stock_id: number;
  notes?: string;
}

export interface CreateCaisseSessionRequest {
  stock_id: number;
  user_id: number;
  opening_balance: number;
  notes?: string;
}

export interface CloseCaisseSessionRequest {
  id: number;
  closing_balance: number;
  notes?: string;
}



// Enhanced sale request to include client
export interface CreateEnhancedSaleRequest extends CreateSaleRequest {
  client_id?: number;
  payment_method?: 'cash' | 'card' | 'check' | 'credit';
  payment_status?: 'pending' | 'partial' | 'paid';
  notes?: string;
}

// Dashboard statistics types
export interface StockStatistics {
  total_sales: number;
  total_purchases: number;
  total_clients: number;
  total_fournisseurs: number;
  total_products: number;
  low_stock_count: number;
  pending_repairs: number;
  overdue_cheques: number;
  daily_profit: number;
  monthly_profit: number;
}

export interface GlobalStatistics {
  stocks: { [key: string]: StockStatistics };
  total_profit: number;
  best_performing_stock: string;
  total_sales_all_stocks: number;
}

export interface CreateSaleRequest {
  user_id: number;
  stock_id: number;
  items: {
    product_id: number;
    quantity: number;
    unit_price: number;
  }[];
}

// Stock mapping for frontend compatibility
export const STOCK_MAPPING = {
  'al-ouloum': 1,
  'renaissance': 2,
  'gros': 3,
} as const;

export const STOCK_NAMES = {
  1: 'Librairie Al Ouloum',
  2: 'Librairie La Renaissance',
  3: 'Gros',
} as const;

export const STOCK_SLUGS = {
  1: 'al-ouloum',
  2: 'renaissance',
  3: 'gros',
} as const;

export type StockSlug = keyof typeof STOCK_MAPPING;
export type StockId = typeof STOCK_MAPPING[StockSlug];
