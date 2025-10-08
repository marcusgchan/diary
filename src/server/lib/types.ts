export type GetPostQuery = {
  id: string;
  title: string;
  description: string;
  image: {
    id: string;
    key: string;
    name: string;
  };
};

export type GetPostImageLoaded = {
  type: "loaded";
  id: string;
  url: string;
  key: string;
  name: string;
};

export type GetPostImageError = {
  type: "error";
  id: string;
  key: string;
  name: string;
};

export type GetPostImage = GetPostImageLoaded | GetPostImageError;

export type GetPostWithImageState = Omit<GetPostQuery, "image"> & {
  image: {
    id: string;
    key: string;
  };
};

export type GetPostGroupByImages = Pick<
  EditPostWithLoadedImageState,
  "id" | "title" | "description"
> & {
  images: PostImage[];
};

export type ImageLoadedState = {
  type: "loaded";
  id: string;
  name: string;
  size: number;
  mimetype: string;
  order: number;
  key: string;
  isSelected: boolean;
};

export type ImageUploadingState = {
  type: "uploading";
  id: string;
  name: string;
  size: number;
  mimetype: string;
  order: number;
  key: string;
  isSelected: boolean;
};

export type ImageErrorState = {
  type: "error";
  id: string;
  key?: string;
  isSelected: boolean;
};

export type EditPostQuery = {
  id: string;
  title: string;
  description: string;
  isSelected: boolean;
  order: number;
  image: PostImage;
};

export type PostImage = {
  id: string;
  isSelected: boolean;
  key: string;
  name: string;
  mimetype: string;
  size: number;
  order: number;
};

export type EditPostWithLoadedImageState = Omit<EditPostQuery, "image"> & {
  image: ImageLoadedState;
};

export type EditPostGroupByNonEmptyImages = Pick<
  EditPostWithLoadedImageState,
  "id" | "title" | "description" | "order" | "isSelected"
> & {
  images: (PostImage & {
    isSelected: boolean;
  })[];
};

export type EditPostGroupByImages = Pick<
  EditPostWithLoadedImageState,
  "id" | "title" | "description" | "order" | "isSelected"
> & {
  images: ((ImageLoadedState | ImageErrorState | ImageUploadingState) & {
    isSelected: boolean;
  })[];
};

export interface GeoJson<TFeature extends GeoJsonFeature> {
  type: "FeatureCollection";
  features: TFeature[];
}

export interface GeoJsonFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: Record<string, string>;
}

export interface GeoJsonImageFeature extends GeoJsonFeature {
  properties: {
    id: string;
    url: string;
    postId: string;
  };
}
