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

export type GetPostWithImageState = Omit<GetPostQuery, "image"> & {
  image: GetPostImageLoaded | GetPostImageError;
};

export type GetPostGroupByImages = Pick<
  EditPostWithNonEmptyImageState,
  "id" | "title" | "description"
> & {
  images: (GetPostImageLoaded | GetPostImageError)[];
};

export type ImageLoadedState = {
  type: "loaded";
  id: string;
  name: string;
  size: number;
  mimetype: string;
  url: string;
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
  image: {
    id: string;
    isSelected: boolean;
    key: string;
    name: string;
    mimetype: string;
    size: number;
    order: number;
  };
};

export type EditPostWithImageState = Omit<EditPostQuery, "image"> & {
  image: ImageLoadedState | ImageErrorState;
};

export type EditPostWithNonEmptyImageState = Omit<EditPostQuery, "image"> & {
  image: ImageLoadedState | ImageErrorState;
};

export type EditPostGroupByNonEmptyImages = Pick<
  EditPostWithNonEmptyImageState,
  "id" | "title" | "description" | "order" | "isSelected"
> & {
  images: ((ImageLoadedState | ImageErrorState) & {
    isSelected: boolean;
  })[];
};

export type EditPostGroupByImages = Pick<
  EditPostWithNonEmptyImageState,
  "id" | "title" | "description" | "order" | "isSelected"
> & {
  images: ((ImageLoadedState | ImageErrorState | ImageUploadingState) & {
    isSelected: boolean;
  })[];
};
