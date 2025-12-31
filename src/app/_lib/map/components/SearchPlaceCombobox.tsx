import * as React from "react";
import { ChevronsUpDownIcon, MapPinIcon } from "lucide-react";

import { Button } from "@/_lib/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/_lib/ui/command";
import {
  Popover,
  PopoverContentInline,
  PopoverTrigger,
} from "@/_lib/ui/popover";
import { useAutocompleteSuggestions } from "../hooks/useAutocompleteSuggestions";
import { useMap } from "@vis.gl/react-google-maps";

type SearchPlaceComboboxProps = {
  onPlaceSelect?: (place: google.maps.places.Place) => void;
  defaultAddress?: string | null;
  onZoomChange?: (zoom: number) => void;
};

export function SearchPlaceCombobox({
  onPlaceSelect,
  defaultAddress,
  onZoomChange,
}: SearchPlaceComboboxProps = {}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [selectedPlace, setSelectedPlace] = React.useState(
    defaultAddress ?? "",
  );

  // Update selectedPlace when defaultAddress changes
  React.useEffect(() => {
    if (defaultAddress) {
      setSelectedPlace(defaultAddress);
    }
  }, [defaultAddress]);

  const { suggestions, resetSession, isLoading } =
    useAutocompleteSuggestions(value);
  const predictions = React.useMemo(
    () =>
      suggestions
        .filter((suggestion) => suggestion.placePrediction)
        .map(({ placePrediction }) => placePrediction!),
    [suggestions],
  );

  const map = useMap();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="mt-4 w-[200px] justify-between bg-background"
        >
          {selectedPlace || "Search place"}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContentInline className="w-[200px]">
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            className="outline-none"
            placeholder="Search for a place..."
            value={value}
            onValueChange={setValue}
          />
          <CommandList>
            {!isLoading && !value && suggestions.length === 0 && (
              <CommandEmpty>No Place Found</CommandEmpty>
            )}

            <CommandGroup>
              {predictions.map((prediction) => {
                return (
                  <CommandItem
                    value={prediction.placeId}
                    onSelect={async () => {
                      setSelectedPlace(prediction.mainText!.text);
                      setValue("");
                      setOpen(false);

                      const fields = await prediction
                        .toPlace()
                        .fetchFields({ fields: ["location"] });

                      map!.panTo(fields.place.location!);
                      const newZoom = 15;
                      map!.setZoom(newZoom);

                      if (onZoomChange) {
                        onZoomChange(newZoom);
                      }

                      if (onPlaceSelect) {
                        onPlaceSelect(fields.place);
                      }

                      resetSession();
                    }}
                    key={prediction.placeId}
                  >
                    <MapPinIcon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{prediction.mainText?.text}</span>
                      <span className="text-xs text-muted-foreground">
                        {prediction.secondaryText?.text}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContentInline>
    </Popover>
  );
}
