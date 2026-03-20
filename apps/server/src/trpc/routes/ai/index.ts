import { compose, generateEmailSubject } from './compose';
import { generateSummary } from './summary';
import { chat } from './chat';
import { generateSearchQuery } from './search';
import { router } from '../../trpc';

export const aiRouter = router({
  chat,
  generateSummary,
  generateSearchQuery,
  compose,
  generateEmailSubject,
});
