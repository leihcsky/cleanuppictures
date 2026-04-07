export type CreditTransactionType =
  | 'free_daily'
  | 'consume_standard'
  | 'consume_hd'
  | 'consume_pro'
  | 'purchase'
  | 'refund';

export type JobMode = 'standard' | 'high_quality';

export type JobStatus = 'pending' | 'success' | 'failed';

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'canceled';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'unpaid'
  | 'paused';

export interface UsersTable {
  id: number;
  email: string | null;
  password_hash: string | null;
  is_guest: boolean;
  created_at: Date;
}

export interface CreditsTable {
  user_id: number;
  balance: number;
  updated_at: Date;
}

export interface CreditTransactionsTable {
  id: number;
  user_id: number;
  amount: number;
  type: CreditTransactionType;
  reference_id: number | null;
  created_at: Date;
}

export interface ImagesTable {
  id: number;
  user_id: number;
  url: string;
  width: number;
  height: number;
  created_at: Date;
}

export interface JobsTable {
  id: number;
  user_id: number;
  image_id: number;
  mode: JobMode;
  status: JobStatus;
  credit_cost: number;
  is_hd: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ResultsTable {
  id: number;
  job_id: number;
  image_url: string;
  resolution: string;
  created_at: Date;
}

export interface DailyUsageTable {
  id: number;
  user_id: number;
  date: string;
  used_count: number;
  created_at: Date;
}

export interface OrdersTable {
  id: number;
  user_id: number;
  amount: number;
  credits: number;
  status: OrderStatus;
  created_at: Date;
}

export interface SubscriptionsTable {
  id: number;
  user_id: number;
  plan: string;
  credits_per_month: number;
  start_date: Date;
  end_date: Date;
  status: SubscriptionStatus;
  created_at: Date;
}

export interface CreateUserInput {
  email?: string | null;
  password_hash?: string | null;
  is_guest?: boolean;
}

export interface CreateCreditAccountInput {
  user_id: number;
  balance?: number;
}

export interface CreateCreditTransactionInput {
  user_id: number;
  amount: number;
  type: CreditTransactionType;
  reference_id?: number | null;
}

export interface CreateImageInput {
  user_id: number;
  url: string;
  width: number;
  height: number;
}

export interface CreateJobInput {
  user_id: number;
  image_id: number;
  mode: JobMode;
  status?: JobStatus;
  credit_cost: number;
  is_hd?: boolean;
}

export interface UpdateJobStatusInput {
  id: number;
  status: JobStatus;
}

export interface CreateResultInput {
  job_id: number;
  image_url: string;
  resolution: string;
}

export interface UpsertDailyUsageInput {
  user_id: number;
  date: string;
  used_count?: number;
}

export interface CreateOrderInput {
  user_id: number;
  amount: number;
  credits: number;
  status?: OrderStatus;
}

export interface CreateSubscriptionInput {
  user_id: number;
  plan: string;
  credits_per_month: number;
  start_date: Date;
  end_date: Date;
  status: SubscriptionStatus;
}

export interface CreditSystemDbObjects {
  users: UsersTable;
  credits: CreditsTable;
  credit_transactions: CreditTransactionsTable;
  images: ImagesTable;
  jobs: JobsTable;
  results: ResultsTable;
  daily_usage: DailyUsageTable;
  orders: OrdersTable;
  subscriptions: SubscriptionsTable;
}
