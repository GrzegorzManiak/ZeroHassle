export const createLoggingMiddleware = () => {
    return async (opts: {
        path: string;
        type: 'query' | 'mutation' | 'subscription';
        next: () => Promise<any>;
        input: any;
        ctx: any;
    }) => opts.next();
};
