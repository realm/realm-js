// This is meant to be replaced with a preferred logging implementation.
export const logger = {
  info(message: string) {
    console.info(new Date().toLocaleString(), '|', message);
  },
  error(message: string) {
    console.error(new Date().toLocaleString(), '|', message);
  },
};
