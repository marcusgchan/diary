import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/_lib/ui/drawer";
import { Button } from "../../ui/button";
import { MapPin } from "lucide-react";
import InteractiveMap from "../../map/components/DrawerMap";
import { AutocompleteControl as AutocompleteControl } from "../../map/components/AutocompleteControl";
import { SearchPlaceCombobox } from "../../map/components/SearchPlaceCombobox";

export function LocationDrawer() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button type="button" className="flex gap-1 text-muted-foreground">
          <MapPin />
          Edit Images Location
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Location Search</DrawerTitle>
          <DrawerDescription>
            Search a location for the selected image.
          </DrawerDescription>
        </DrawerHeader>
        <div className="h-dvh">
          <InteractiveMap defaultCenter={{ lng: 0, lat: 0 }} defaultZoom={5}>
            <AutocompleteControl>
              <SearchPlaceCombobox />
            </AutocompleteControl>
          </InteractiveMap>
        </div>
        <DrawerFooter>
          <Button autoFocus>Submit</Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
