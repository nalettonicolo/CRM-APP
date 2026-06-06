import { Header } from "@/components/layout/header";
import { PageBody } from "@/components/layout/page-body";
import { cn } from "@/lib/utils";

/** Layout standard pagina app: header sticky + contenuto con padding responsive. */
export function AppPage({
  title,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("flex min-h-screen min-w-0 flex-col", className)}>
      <Header title={title} />
      <PageBody className={bodyClassName}>{children}</PageBody>
    </div>
  );
}
