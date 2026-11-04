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
