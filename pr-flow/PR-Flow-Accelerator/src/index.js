export const run = (event, context) => {
  return {
    success: false,
    message: `Pull request #${event.pullrequest.id} is not ready to be merged.`
  };
};
