"use client";
import React, { useContext, useState } from "react";
import { cn } from "../../utils/cx";
import { Entries } from "./Entries";
import { useIsMobile } from "../../shared/hooks/use-mobile";
import { ArrowLeftToLine, PanelLeftIcon } from "lucide-react";

type SidebarContextProps = {
  open: boolean;
  toggleSidebar: () => void;
  isMobile: boolean;
  isMobileOpen: boolean;
  toggleMobileSidebar: () => void;
  toggleHelper: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

export function SidebarProvider({
  children,
}: {
  children: React.ReactNode[] | React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const [open, setIsOpen] = useState<boolean>(true);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const toggleSidebar = () => setIsOpen((prev) => !prev);
  const toggleMobileSidebar = () => setIsMobileOpen((prev) => !prev);

  function toggleHelper() {
    if (isMobile) {
      toggleMobileSidebar();
    } else {
      toggleSidebar();
    }
  }

  return (
    <SidebarContext.Provider
      value={{
        open,
        toggleSidebar,
        isMobile,
        isMobileOpen,
        toggleMobileSidebar,
        toggleHelper,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("Use SidebarContext inside <SidebarProvider/>");
  }

  return ctx;
}

export function SidebarLayout({
  children,
  className,
  ...props
}: React.ComponentProps<"main">) {
  const { open, isMobileOpen, isMobile } = useSidebar();

  if (isMobile) {
    return (
      <main
        className={cn(
          "grid overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out [grid-template-rows:1fr]",
          isMobileOpen && "gap-2 [grid-template-columns:1fr_0]",
          !isMobileOpen && "[grid-template-columns:0_1fr]",
          className,
        )}
        {...props}
      >
        {children}
      </main>
    );
  }

  return (
    <main
      className={cn(
        "grid transition-[grid-template-columns] duration-300 ease-in-out [grid-template-rows:1fr]",
        open && "gap-2 [grid-template-columns:300px_1fr]",
        !open && "[grid-template-columns:0_1fr]",
        className,
      )}
      {...props}
    >
      {children}
    </main>
  );
}

export function SidebarTrigger({ ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar, isMobile, toggleMobileSidebar } = useSidebar();
  return (
    <button
      {...props}
      onClick={() => {
        if (isMobile) {
          toggleMobileSidebar();
        } else {
          toggleSidebar();
        }
      }}
      type="button"
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  );
}

export function Sidebar({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { open, isMobileOpen, isMobile } = useSidebar();
  const isOpen = (isMobile && isMobileOpen) || (!isMobile && open);
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 overflow-hidden rounded bg-sidebar p-2 text-sidebar-foreground transition-[width,opacity] duration-300 ease-in-out",
        isOpen ? "opacity-100" : "opacity-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarHeader({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "overflow-hidden text-ellipsis whitespace-nowrap text-2xl transition-opacity duration-300 ease-in-out",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarContent({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex-1 overflow-hidden transition-opacity duration-300 ease-in-out",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarFooter({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}

export function EntrySidebar() {
  const { toggleHelper } = useSidebar();
  return (
    <Sidebar>
      <SidebarHeader>Entries</SidebarHeader>
      <SidebarContent>
        <Entries />
      </SidebarContent>
      <SidebarFooter className="text-right">
        <button type="button" onClick={toggleHelper}>
          <ArrowLeftToLine />
          <span className="sr-only">Close Sidebar</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
