import axios from 'axios';

const RAZORPAY_API_BASE = process.env.RAZORPAY_BASE_URL;

type RazorpayHttpMethod = 'GET' | 'POST' | 'PATCH';

export interface RazorpayPaginationOptions {
  count?: number;
  skip?: number;
}

export interface CreatePlanRequest {
  period: string;
  interval: number;
  item: {
    name: string;
    amount: number;
    currency: string;
    description?: string;
  };
  notes?: Record<string, string>;
  [key: string]: unknown;
}

export interface CreateSubscriptionRequest {
  plan_id: string;
  total_count: number;
  quantity?: number;
  customer_notify?: boolean | 0 | 1;
  start_at?: number;
  expire_by?: number;
  addons?: unknown[];
  offer_id?: string;
  notes?: Record<string, string>;
  [key: string]: unknown;
}

export interface CreateSubscriptionLinkRequest {
  type?: string;
  quantity?: number;
  total_count?: number;
  expire_by?: number;
  customer_notify?: boolean | 0 | 1;
  subscription_id?: string;
  notes?: Record<string, string>;
  [key: string]: unknown;
}

export interface UpdateSubscriptionRequest {
  plan_id?: string;
  quantity?: number;
  remaining_count?: number;
  schedule_change_at?: 'now' | 'cycle_end';
  customer_notify?: boolean | 0 | 1;
  [key: string]: unknown;
}

export interface PauseSubscriptionRequest {
  pause_at?: 'now' | 'cycle_end' | number;
  [key: string]: unknown;
}

export interface ResumeSubscriptionRequest {
  resume_at?: 'now' | number;
  [key: string]: unknown;
}

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required');
  }

  return { keyId, keySecret };
}

function ensureId(id: string, field: string): string {
  const value = id?.trim();
  if (!value) {
    throw new Error(`${field} is required`);
  }
  return value;
}

function parseJsonSafely(data: unknown): unknown {
  if (typeof data !== 'string') return data;

  const trimmed = data.trim();
  if (!trimmed) return {};

  try {
    return JSON.parse(trimmed);
  } catch {
    return data;
  }
}

async function razorpayRequest<T>(
  method: RazorpayHttpMethod,
  path: string,
  options?: {
    data?: unknown;
    params?: object;
  }
): Promise<T> {
  const { keyId, keySecret } = getRazorpayCredentials();

  try {
    const response = await axios.request<T>({
      method,
      url: `${RAZORPAY_API_BASE}${path}`,
      auth: {
        username: keyId,
        password: keySecret
      },
      headers: {
        'Content-Type': 'application/json'
      },
      data: options?.data,
      params: options?.params,
      responseType: 'text',
      transformResponse: [(data) => data]
    });

    const parsedData = parseJsonSafely(response.data);
    if (typeof parsedData === 'string') {
      throw new Error(`Invalid response received from Razorpay for ${method} ${path}`);
    }

    return parsedData as T;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const parsedErrorBody = parseJsonSafely(error.response?.data);
      const description =
        (parsedErrorBody as { error?: { description?: string } } | undefined)?.error?.description ||
        (parsedErrorBody as { message?: string } | undefined)?.message;
      const status = error.response?.status ? ` (${error.response.status})` : '';

      throw new Error(description || `Razorpay request failed${status}: ${method} ${path}`);
    }
    throw error;
  }
}

export function formatPlan(plan: any) {
  return {
    planId: plan.id,
    planName: plan.item?.name ?? '',
    description: plan.item?.description ?? '',
    amount: new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: plan.item?.currency || 'INR'
    }).format((plan.item?.amount || 0) / 100),
    billingCycle: `Every ${plan.interval} ${plan.period}${plan.interval > 1 ? 's' : ''}`,
    createdAt: plan.created_at
      ? new Date(plan.created_at * 1000).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      : null,
    currency: plan.item?.currency || 'INR',
    rawAmount: plan.item?.amount || 0
  };
}

export async function createPlan(payload: CreatePlanRequest): Promise<any> {
  return razorpayRequest<any>('POST', '/plans', { data: payload });
}

export async function fetchAllPlans(options: RazorpayPaginationOptions = {}): Promise<any> {
  return razorpayRequest<any>('GET', '/plans', { params: options });
}

export async function fetchPlanById(planId: string): Promise<any> {
  return razorpayRequest<any>('GET', `/plans/${ensureId(planId, 'planId')}`);
}

export async function createSubscription(payload: CreateSubscriptionRequest): Promise<any>;
export async function createSubscription(planId: string, startAt?: number): Promise<any>;
export async function createSubscription(
  payloadOrPlanId: CreateSubscriptionRequest | string,
  startAt?: number
): Promise<any> {
  if (typeof payloadOrPlanId === 'string') {
    return razorpayRequest<any>('POST', '/subscriptions', {
      data: {
        plan_id: ensureId(payloadOrPlanId, 'planId'),
        customer_notify: true,
        quantity: 1,
        total_count: 12,
        start_at: startAt
      }
    });
  }

  return razorpayRequest<any>('POST', '/subscriptions', {
    data: payloadOrPlanId
  });
}

export async function createSubscriptionLink(payload: CreateSubscriptionLinkRequest): Promise<any> {
  return razorpayRequest<any>('POST', '/subscription_links', { data: payload });
}

export async function fetchAllSubscriptions(options: RazorpayPaginationOptions = {}): Promise<any> {
  return razorpayRequest<any>('GET', '/subscriptions', { params: options });
}

export async function fetchSubscriptionById(subscriptionId: string): Promise<any> {
  return razorpayRequest<any>('GET', `/subscriptions/${ensureId(subscriptionId, 'subscriptionId')}`);
}

export async function cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean = false): Promise<any> {
  return razorpayRequest<any>('POST', `/subscriptions/${ensureId(subscriptionId, 'subscriptionId')}/cancel`, {
    data: { cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 }
  });
}

export async function updateSubscription(subscriptionId: string, payload: UpdateSubscriptionRequest): Promise<any> {
  return razorpayRequest<any>('PATCH', `/subscriptions/${ensureId(subscriptionId, 'subscriptionId')}`, {
    data: payload
  });
}

export async function fetchPendingUpdateDetails(subscriptionId: string): Promise<any> {
  return razorpayRequest<any>('GET', `/subscriptions/${ensureId(subscriptionId, 'subscriptionId')}/retrieve_scheduled_changes`);
}

export async function cancelPendingUpdate(subscriptionId: string): Promise<any> {
  return razorpayRequest<any>('POST', `/subscriptions/${ensureId(subscriptionId, 'subscriptionId')}/cancel_scheduled_changes`);
}

export async function pauseSubscription(subscriptionId: string, payload: PauseSubscriptionRequest = { pause_at: 'now' }): Promise<any> {
  return razorpayRequest<any>('POST', `/subscriptions/${ensureId(subscriptionId, 'subscriptionId')}/pause`, {
    data: payload
  });
}

export async function resumeSubscription(subscriptionId: string, payload: ResumeSubscriptionRequest = { resume_at: 'now' }): Promise<any> {
  return razorpayRequest<any>('POST', `/subscriptions/${ensureId(subscriptionId, 'subscriptionId')}/resume`, {
    data: payload
  });
}

export async function fetchAllInvoicesForSubscription(
  subscriptionId: string,
  options: RazorpayPaginationOptions = {}
): Promise<any> {
  const validSubscriptionId = ensureId(subscriptionId, 'subscriptionId');

  return razorpayRequest<any>('GET', '/invoices', {
    params: {
      subscription_id: validSubscriptionId,
      ...options
    }
  });
}

export async function fetchPlans(options: RazorpayPaginationOptions = { count: 10, skip: 0 }) {
  const response = await fetchAllPlans(options);
  const formattedPlans = Array.isArray(response?.items) ? response.items.map(formatPlan) : [];
  return { formattedPlans, response };
}

const RazorPayService = {
  createPlan,
  fetchAllPlans,
  fetchPlanById,
  createSubscription,
  createSubscriptionLink,
  fetchAllSubscriptions,
  fetchSubscriptionById,
  cancelSubscription,
  updateSubscription,
  fetchPendingUpdateDetails,
  cancelPendingUpdate,
  pauseSubscription,
  resumeSubscription,
  fetchAllInvoicesForSubscription,
  fetchPlans,
  formatPlan
};

export default RazorPayService;
