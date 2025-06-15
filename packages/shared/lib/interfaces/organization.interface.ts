import type { Subscription } from './subscription.interface.js';
import type { Plan } from '../constants/index.js';

export interface Organization {
  id: string;
  type: 'COMPANY' | 'INDIVIDUAL';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  email: string | null;
  phone?: string;
  name?: string;
  addresses: any[];
  logo?: string;
  subscriptionId: string;
  subscription: Subscription;
  defaultPaymentMethodId?: string;
  ownerId: string;
  plan: OrganizationPlan;
  planId: string;
  isBlocked: boolean;
}

export interface OrganizationPlan {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  slug: Plan;
  name: string;
  description: string;
  amount?: number;
}
