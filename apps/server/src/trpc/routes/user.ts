import { privateProcedure, router } from '../trpc';
import { TRPCError } from '@trpc/server';

export const userRouter = router({
  delete: privateProcedure.mutation(async ({ ctx }) => {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Self-service account deletion is disabled. Use the CLI instead.',
    });
  }),
});
