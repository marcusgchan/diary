type Success<Data> = [null, Data];

type TError = [Error, null];

type Result<T> = Promise<Success<T> | TError>;

export async function tryCatch<T>(promise: Promise<T>): Result<T> {
  try {
    const data = await promise;
    return [null, data];
  } catch (e) {
    return [e as Error, null];
  }
}
