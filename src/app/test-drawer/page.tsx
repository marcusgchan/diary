"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/_lib/ui/drawer";
import { Button } from "@/_lib/ui/button";

export default function TestDrawerPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold">Drawer Test Page</h1>
      <Button onClick={() => setIsOpen(true)}>Open Drawer</Button>

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Test Drawer</DrawerTitle>
            <DrawerDescription>
              This is a test drawer to check if the footer is cut off on mobile.
            </DrawerDescription>
          </DrawerHeader>
          <div className="h-[50vh] min-h-[300px] max-h-[600px] bg-muted p-4">
            <p>This simulates the map area.</p>
            <p className="text-muted-foreground">
              The footer buttons below should be visible above the URL bar.
            </p>
          </div>
          <DrawerFooter className="flex md:flex-row md:justify-end">
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
            <Button>Save</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

