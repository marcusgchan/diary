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
import { LocationMarker } from "../../map/components/LocationMarker";
import { usePosts } from "../contexts/PostsContext";
import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/TrpcProvider";
import { useParams } from "next/navigation";

export function LocationDrawer() {
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
    // Blur the trigger button when drawer opens to prevent aria-hidden warning
    if (open && triggerButtonRef.current) {
      triggerButtonRef.current.blur();
    }
    if (open && initialLocation) {
      setSelectedLocation(initialLocation);
    }
  };

  // State to control drawer open/close
  const [isOpen, setIsOpen] = useState(false);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

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

    let address: string | null = null;
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
        address = `${streetNumber.long_name} ${route.long_name}`;
      } else if (result.formatted_address) {
        // Fallback to full formatted address if no street address
        address = result.formatted_address;
      }
    }

    // Only set location if we have an address
    if (address) {
      setSelectedLocation({
        address,
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
  // Map remounts when drawer closes, so we need to persist zoom state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [zoom, setZoom] = useState<number>(initialZoom);

  // Update zoom when post location changes (e.g., when navigating back to page)
  useEffect(() => {
    setZoom(initialZoom);
  }, [initialZoom]);

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <button
          ref={triggerButtonRef}
          type="button"
          className="hidden"
          aria-hidden="true"
        >
          Hidden trigger
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Location Search</DrawerTitle>
          <DrawerDescription>
            Search a location for the selected post.
          </DrawerDescription>
        </DrawerHeader>
        <div className="h-dvh">
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
                onZoomChange={setZoom}
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
        <DrawerFooter>
          <Button onClick={handleSubmit} disabled={!selectedLocation}>
            Submit
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export function LocationDisplay() {
  const { state } = usePosts();
  const post = state.posts.find((post) => post.isSelected)!;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
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

  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    // Blur the trigger button when drawer opens to prevent aria-hidden warning
    if (open && triggerButtonRef.current) {
      triggerButtonRef.current.blur();
    }
    if (open && initialLocation) {
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

    let address: string | null = null;
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
        address = `${streetNumber.long_name} ${route.long_name}`;
      } else if (result.formatted_address) {
        // Fallback to full formatted address if no street address
        address = result.formatted_address;
      }
    }

    // Only set location if we have an address
    if (address) {
      setSelectedLocation({
        address,
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
    <Drawer open={isOpen} onOpenChange={handleOpenChange} modal={true}>
      <DrawerTrigger asChild>
        <button
          ref={triggerButtonRef}
          type="button"
          className="hidden"
          aria-hidden="true"
        >
          Hidden trigger
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Location Search</DrawerTitle>
          <DrawerDescription>
            Search a location for the selected post.
          </DrawerDescription>
        </DrawerHeader>
        <div className="h-dvh">
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
                onZoomChange={setZoom}
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
        <DrawerFooter>
          <Button onClick={handleSubmit} disabled={!selectedLocation}>
            Submit
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
