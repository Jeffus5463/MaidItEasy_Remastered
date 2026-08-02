export type BookingStatus = 'pending' | 'assigned' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentMethod = 'gcash' | 'cash';
export type PaymentStatus = 'awaiting_payment' | 'verified' | 'rejected';
export type PricingModel = 'per_hour' | 'per_unit';
export type AssignmentSource = 'auto' | 'manual' | 'fcfs';

export interface ServiceRow {
  id: string;
  name: string;
  price: number;
  suffix: string;
  duration: string;
  price_label: string;
  active: boolean;
  pricing_model: PricingModel;
  hourly_rate: number | null;
  estimated_minutes_per_unit: number;
}

export interface PartnerRow {
  id: string;
  name: string;
  initials: string;
  rating: number;
  jobs_count: number;
  commission_rate: number;
  verified: boolean;
  active: boolean;
  service_tags: string[];
  barangay: string | null;
  contact: string | null;
  nbi_verified: boolean;
  agreement_verified: boolean;
  available_days: string[];
  available_start_hour: number;
  available_end_hour: number;
  auth_user_id: string | null;
  email: string | null;
  must_change_password: boolean;
}

export interface BookingRow {
  id: string;
  customer_id: string;
  customer_name: string | null;
  partner_id: string | null;
  service_id: string;
  units: number | null;
  tier: string | null;
  start_hour: number;
  duration_hours: number;
  assignment_source: AssignmentSource;
  date: string;
  barangay: string;
  landmark: string;
  contact: string;
  total: number;
  status: BookingStatus;
  decline_reason: string | null;
  decline_note: string | null;
  refund_needed: boolean;
  cancel_reason: string | null;
  created_at: string;
}

export interface EarningRow {
  id: string;
  booking_id: string;
  partner_id: string;
  job_fee: number;
  commission_rate: number;
  commission_amount: number;
  earned_at: string;
  paid_at: string | null;
  payout_id: string | null;
}

export interface PaymentRow {
  id: string;
  booking_id: string;
  method: PaymentMethod;
  gcash_ref: string | null;
  status: PaymentStatus;
  reject_reason: string | null;
  created_at: string;
}
