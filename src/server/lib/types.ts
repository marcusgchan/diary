export type GetPostQuery = {
  id: string;
  title: string;
  description: string;
  image: { id: string; key: string; name: string };
};

export type GetPostFormQuery = {
  id: string;
  title: string;
  description: string;
  order: number;
  image: {
    id: string;
    name: string;
    size: number;
    mimetype: string;
    order: number;
    key: string;
  };
};

export type PostImage = {
  id: string;
  key: string;
  name: string;
};

export type Post = {
  id: string;
  title: string;
  description: string;
  images: PostImage[];
};

export interface BasePostFormImage {
  id: string;
  type: string;
  name: string;
  size: number;
  mimetype: string;
  order: number;
  key: string;
  isSelected: boolean;
}

export interface PostFormLoadedImage extends BasePostFormImage {
  type: "loaded";
}

export interface PostFormUploadingImage extends BasePostFormImage {
  type: "uploading";
}

export interface PostFormCompressionErrorImage extends BasePostFormImage {
  type: "compression_error";
}

export type PostFormImage =
  | PostFormLoadedImage
  | PostFormUploadingImage
  | PostFormCompressionErrorImage;

export type PostForm = {
  id: string;
  title: string;
  description: string;
  order: number;
  isSelected: boolean;
  images: PostFormImage[];
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
