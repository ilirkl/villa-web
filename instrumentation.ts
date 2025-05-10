export function register() {
  // Register any instrumentation code here
  console.log('Instrumentation registered');
}

export const onRequestError = async (
  err: Error,
  request: Request,
  context: { pathname: string }
) => {
  // Log server errors to help with debugging
  console.error('Server error:', {
    message: err.message,
    stack: err.stack,
    pathname: context.pathname,
    url: request.url,
  });
};