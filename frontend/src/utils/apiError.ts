import axios from "axios";

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const responseMessage = (
      error.response?.data as { message?: string } | undefined
    )?.message;

    return responseMessage || error.message || fallback;
  }

  return error instanceof Error ? error.message : fallback;
};

/** True when the API explicitly reports that a resource does not exist. */
export const isNotFoundError = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === 404;
