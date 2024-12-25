import { type TRPCClientErrorBase } from "@trpc/client";
import { type UseTRPCQueryResult } from "@trpc/react-query/shared";
import { type inferRouterError } from "@trpc/server";

type Props<TData> = UseTRPCQueryResult<
  TData,
  TRPCClientErrorBase<DefaultErrorShape>
> & {
  children: (data: TData) => React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
};

export default function FetchResolver<TData>({
  data,
  isLoading,
  isError,
  loadingComponent = <div>Loading...</div>,
  errorComponent = <p>Something went wrong</p>,
  children,
}: Props<TData>) {
  if (isLoading) {
    return loadingComponent;
  } else if (isError) {
    return errorComponent;
  } else if (!data) {
    return <p>hmm</p>;
  } else {
    return children(data);
  }
}
