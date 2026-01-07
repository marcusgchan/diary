import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/_lib/ui/drawer";
import { Button } from "../../ui/button";
import { MapPin } from "lucide-react";
import InteractiveMap from "../../map/components/DrawerMap";
import { AutocompleteControl as AutocompleteControl } from "../../map/components/AutocompleteControl";
import { SearchPlaceCombobox } from "../../map/components/SearchPlaceCombobox";
import { LocationMarker } from "../../map/components/LocationMarker";
import { usePosts } from "../contexts/PostsContext";
import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/TrpcProvider";
import { useParams } from "next/navigation";

export function LocationDisplay() {
  const { state } = usePosts();
  const post = state.posts.find((post) => post.isSelected)!;
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleOpen = () => {
    // Blur the button before opening to prevent aria-hidden warning
    buttonRef.current?.blur();
    setIsOpen(true);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <MapPin size={14} />
        {post.location ? post.location.address : "No location set"}
      </button>
      <LocationDrawerWithState isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  );
}

function LocationDrawerWithState({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const { state, dispatch } = usePosts();

  const api = useTRPC();
  const params = useParams();
  const entryId = Number(params.entryId);
  const diaryId = Number(params.diaryId);
  const { data: uploadedImages } = useQuery(
    api.diary.getImagesWithLocationByEntryId.queryOptions({ entryId }),
  );

  const post = state.posts.find((post) => post.isSelected)!;

  // Initialize selected location from post's existing location
  // location is all-or-nothing due to DB constraints
  const initialLocation = post.location ?? null;

  // State for selected location (always has address when it exists)
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string;
    longitude: number;
    latitude: number;
  } | null>(initialLocation);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Reset to initial location when opening
      setSelectedLocation(initialLocation);
    } else {
      // Reset to initial location when closing (discard unsaved changes)
      setSelectedLocation(initialLocation);
    }
  };

  // Initialize with post's existing location or calculate from images
  const averageCoordinates = useMemo(() => {
    // If post has location, use it
    if (post.location) {
      return { lng: post.location.longitude, lat: post.location.latitude };
    }

    // Otherwise calculate from images
    const images = post.images.filter((image) => image.type === "loaded");
    const postImages = uploadedImages?.features.filter((feature) =>
      images.some((image) => image.id === feature.properties.id),
    );

    if (!postImages || postImages.length === 0) {
      return;
    }

    const averageLon =
      postImages.reduce(
        (prev, cur) => prev + (cur.geometry.coordinates[0] ?? 0),
        0,
      ) / postImages.length;
    const averageLat =
      postImages.reduce(
        (prev, cur) => prev + (cur.geometry.coordinates[1] ?? 0),
        0,
      ) / postImages.length;

    return { lng: averageLon, lat: averageLat };
  }, [post, uploadedImages]);

  const coordinatesForGeocoding = selectedLocation
    ? { lng: selectedLocation.longitude, lat: selectedLocation.latitude }
    : averageCoordinates;

  const { data: reverseGeocodingResponse } = useQuery({
    queryKey: [
      "diaries",
      diaryId,
      "entries",
      entryId,
      "location",
      coordinatesForGeocoding,
    ],
    queryFn: async () => {
      if (!coordinatesForGeocoding) return null;
      const geocoder = new google.maps.Geocoder();
      return geocoder.geocode({ location: coordinatesForGeocoding });
    },
    enabled: !!coordinatesForGeocoding,
  });

  const address = useMemo(() => {
    // If we have a selected location with address, use it (from saved post location)
    if (selectedLocation?.address) {
      return selectedLocation.address;
    }

    // Otherwise calculate from reverse geocoding
    if (!reverseGeocodingResponse?.results?.[0]) return null;

    const result = reverseGeocodingResponse.results[0];
    const addressComponents = result.address_components;

    // Find street number and route components
    const streetNumber = addressComponents.find((component) =>
      component.types.includes("street_number"),
    );
    const route = addressComponents.find((component) =>
      component.types.includes("route"),
    );

    // Try street address first, fallback to formatted_address
    if (streetNumber && route) {
      return `${streetNumber.long_name} ${route.long_name}`;
    }
    if (result.formatted_address) {
      return result.formatted_address;
    }

    return null;
  }, [reverseGeocodingResponse, selectedLocation]);

  // Auto-set selectedLocation from averageCoordinates when address is available
  // Only if post doesn't have a saved location
  useEffect(() => {
    if (
      !selectedLocation &&
      !initialLocation &&
      averageCoordinates &&
      address
    ) {
      setSelectedLocation({
        address,
        longitude: averageCoordinates.lng,
        latitude: averageCoordinates.lat,
      });
    }
  }, [selectedLocation, initialLocation, averageCoordinates, address]);

  const handlePlaceSelect = async (place: google.maps.places.Place) => {
    const location = place.location;
    if (!location) return;

    const lat = location.lat();
    const lng = location.lng();

    // Get address from place - try street address first, fallback to formatted_address
    const geocoder = new google.maps.Geocoder();
    const geocodeResult = await geocoder.geocode({ location: { lat, lng } });

    let placeAddress: string | null = null;
    if (geocodeResult.results?.[0]) {
      const result = geocodeResult.results[0];
      const addressComponents = result.address_components;
      const streetNumber = addressComponents.find((component) =>
        component.types.includes("street_number"),
      );
      const route = addressComponents.find((component) =>
        component.types.includes("route"),
      );
      if (streetNumber && route) {
        placeAddress = `${streetNumber.long_name} ${route.long_name}`;
      } else if (result.formatted_address) {
        placeAddress = result.formatted_address;
      }
    }

    if (placeAddress) {
      setSelectedLocation({
        address: placeAddress,
        longitude: lng,
        latitude: lat,
      });
    }
  };

  const handleSubmit = () => {
    if (!selectedLocation) return;

    dispatch({
      type: "UPDATE_POST",
      payload: {
        updates: {
          location: selectedLocation,
        },
      },
    });

    setIsOpen(false);
  };

  const mapCenter = selectedLocation
    ? { lng: selectedLocation.longitude, lat: selectedLocation.latitude }
    : (averageCoordinates ?? { lng: 0, lat: 0 });

  // Compute initial zoom from post data - always use 15 for saved locations, 10 for average
  const initialZoom = post.location ? 15 : 10;

  // Track zoom level to maintain consistency when drawer reopens
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [zoom, setZoom] = useState<number>(initialZoom);

  // Update zoom when post location changes (e.g., when navigating back to page)
  useEffect(() => {
    setZoom(initialZoom);
  }, [initialZoom]);

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange} dismissible={false}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Location Search</DrawerTitle>
          <DrawerDescription>
            Search a location for the selected post.
          </DrawerDescription>
        </DrawerHeader>
        <div className="h-[50vh] max-h-[600px] min-h-[300px]">
          <InteractiveMap
            key={`${isOpen}-${initialZoom}`}
            defaultCenter={mapCenter}
            defaultZoom={initialZoom}
            onZoomChanged={setZoom}
          >
            <AutocompleteControl>
              <SearchPlaceCombobox
                onPlaceSelect={handlePlaceSelect}
                defaultAddress={address}
              />
            </AutocompleteControl>
            {selectedLocation && (
              <LocationMarker
                position={{
                  lat: selectedLocation.latitude,
                  lng: selectedLocation.longitude,
                }}
              />
            )}
          </InteractiveMap>
        </div>
        <DrawerFooter className="flex md:flex-row md:justify-end">
          <DrawerClose asChild>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </DrawerClose>
          <Button onClick={handleSubmit} disabled={!selectedLocation}>
            Save
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
