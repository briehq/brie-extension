import { ITEMS_PER_PAGE } from './pagination.constant.js';
import { OrderBy } from '../interfaces/index.js';
import type { Pagination } from '../interfaces/index.js';

export const INITIAL_PARAMS: Pagination = {
  limit: 1,
  take: ITEMS_PER_PAGE,
  orderProperty: 'createdAt',
  order: OrderBy.DESC,
  q: '',
  excludeIds: false,
};
