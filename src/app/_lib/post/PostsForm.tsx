"use client";

import { Button } from "~/app/_lib/ui/button";
import { Input } from "~/app/_lib/ui/input";
import { Label } from "~/app/_lib/ui/label";
import { Textarea } from "~/app/_lib/ui/textarea";
import {
  useFieldArray,
  useForm,
  FormProvider,
  useFormContext,
} from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent } from "react";
import { cn } from "@/_lib/utils/cx";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "../shared/SortableItem";
import { api } from "~/trpc/TrpcProvider";
import { Skeleton } from "~/app/_lib/ui/skeleton";
import { toast } from "~/app/_lib/ui/use-toast";
import { typeSafeObjectFromEntries } from "@/_lib/utils/typeSafeObjectFromEntries";
import type { RouterInputs, RouterOutputs } from "~/server/trpc";

type Post = RouterOutputs["diary"]["getPostsForForm"][number];

export type PostFormHandle = {
  reset(posts: Post[]): void;
};

const formSchema = z.object({
  posts: z
    .object({
      id: z.string(),
      title: z.string(),
      imageMetadata: z.object({
        name: z.string(),
        size: z.number().max(17840, { message: "Max image size is 17.840MB" }),
        mimetype: z.string().min(1, { message: "Image Required" }),
      }),
      description: z.string(),
    })
    .array(),
});

type FormValues = z.infer<typeof formSchema>;

type UploadStatus =
  | { type: "loading" }
  | { type: "error"; key?: string }
  | { type: "empty" }
  | { type: "uploaded"; url: string; key: string };

type IdToUploadStatus = Record<string, UploadStatus>;

function getUUID() {
  return crypto.randomUUID();
}
const posts = [
  {
    id: getUUID(),
    title: "",
    imageMetadata: {
      name: "",
      size: 0,
      mimetype: "",
    },
    description: "",
  },
];

type HandleImageUploadCallabck = (
  index: number,
  id: string,
  file: File | null,
) => void;

export type PostsFormHandle = {
  reset(data: Post[]): void;
};

type Props = {
  diaryId: number;
  entryId: number;
  mutate(
    this: void,
    data:
      | RouterInputs["diary"]["createPosts"]
      | RouterInputs["diary"]["updatePosts"],
  ): void;
};

export const PostsForm = forwardRef<PostsFormHandle, Props>(function PostsForm(
  { diaryId, entryId, mutate }: Props,
  ref,
) {
  const formMethods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      posts: posts,
    },
  });
  const { control, register, setValue, handleSubmit } = formMethods;
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "posts",
    keyName: "_id",
  });
  const initialStatuses = useMemo(() => {
    return Object.fromEntries(
      fields.map((field) => [field.id, { type: "empty" as const }]),
    );
  }, [fields]);

  const [imgUploadStatuses, setImgUploadStatuses] =
    useState<IdToUploadStatus>(initialStatuses);

  // Store id to key mapping for uploaded images
  const imageKeyToIdRef = useRef<Map<string, string>>(new Map());

  useImperativeHandle(ref, () => {
    return {
      reset(data: Post[]) {
        const fields = data.map(
          ({ id, title, description, image: { name, size, mimetype } }) => {
            return {
              id,
              title,
              description,
              imageMetadata: {
                name,
                size,
                mimetype,
              },
            };
          },
        );
        formMethods.reset({
          posts: fields,
        });
        const postToImageUploadStatus = (
          post: Post,
        ): [Post["id"], UploadStatus] => {
          if (post.image.type === "SUCCESS") {
            return [
              post.id,
              { type: "uploaded", key: post.image.key, url: post.image.url },
            ] as const;
          }

          if (post.image.type === "EMPTY") {
            return [post.id, { type: "empty" }] as const;
          }

          return [post.id, { type: "error", key: post.image.key }] as const;
        };
        const postToKeyIdMap = (
          post: Post,
        ): [NonNullable<Post["image"]["key"]>, Post["id"]] => {
          return [post.image.key!, post.id];
        };

        const newImgUploadStatuses = typeSafeObjectFromEntries(
          data.map(postToImageUploadStatus),
        );
        setImgUploadStatuses(newImgUploadStatuses);
        imageKeyToIdRef.current = new Map(
          data
            .filter(({ image }) => image.type === "SUCCESS")
            .map(postToKeyIdMap),
        );
      },
    };
  });

  function resetImage(id: string, key?: string) {
    setImgUploadStatuses({
      ...imgUploadStatuses,
      [id]: { type: "empty" },
    });
    if (key !== undefined) {
      imageKeyToIdRef.current.delete(key);
    } else {
      imageKeyToIdRef.current = new Map(
        [...imageKeyToIdRef.current.entries()].filter(([_, _id]) => _id !== id),
      );
    }
  }

  const uploadingImages = !!Object.values(imgUploadStatuses).filter(
    (status) => status.type === "loading",
  ).length;
  const { data: newImgUploadStatuses } =
    api.diary.getMultipleImageUploadStatus.useQuery(
      {
        keyToIdMap: imageKeyToIdRef.current,
        entryId: entryId,
        diaryId: diaryId,
        keys: Array.from(imageKeyToIdRef.current.keys()),
      },
      {
        refetchInterval: 3000,
        enabled: uploadingImages,
      },
    );

  useEffect(() => {
    if (newImgUploadStatuses === undefined) {
      return;
    }

    setImgUploadStatuses((statuses) => {
      console.log({ statuses, newImgUploadStatuses });
      const newStatuses = Array.from(Object.entries(statuses)).map(
        ([id, value]) => {
          if (value.type === "loading") {
            const updatedStatus = newImgUploadStatuses[id];

            // still loading
            if (updatedStatus === undefined) {
              return [id, value] as const;
            }

            if (updatedStatus.status === "success") {
              return [
                id,
                {
                  type: "uploaded",
                  key: updatedStatus.key,
                  url: updatedStatus.url,
                },
              ] as const;
            }

            return [id, { type: "error" }] as const;
          }

          return [id, value] as const;
        },
      );
      return typeSafeObjectFromEntries(newStatuses);
    });
  }, [newImgUploadStatuses]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const deleteImageMutation = api.diary.deleteImage.useMutation();

  function addPost() {
    const id = getUUID();
    append({
      id: id,
      title: "",
      description: "",
      imageMetadata: {
        mimetype: "",
        size: 0,
        name: "",
      },
    });
    setImgUploadStatuses((prev) => ({ ...prev, [id]: { type: "empty" } }));
  }

  function removePost(index: number, id: string) {
    const status = imgUploadStatuses[id];
    if (status === undefined) {
      throw Error("status should not be undefined");
    }

    if (status.type === "loading") {
      return;
    }

    // If status is error key is optional
    if (status.type === "uploaded" && status.key) {
      const key = status.key;
      imageKeyToIdRef.current.delete(key);

      deleteImageMutation.mutate(
        { key },
        {
          onSuccess() {
            remove(index);
            setImgUploadStatuses((prev) => {
              const { [id]: _, ...other } = prev;
              return other;
            });
          },
        },
      );
    } else if (status.type === "empty") {
      remove(index);
      setImgUploadStatuses((prev) => {
        const { [id]: _, ...other } = prev;
        return other;
      });
    }
  }

  const utils = api.useUtils();
  const handleImageUpload: HandleImageUploadCallabck = (
    index: number,
    id: string,
    file: File | null,
  ) => {
    if (file) {
      void (async () => {
        const metadata = {
          name: file.name,
          size: file.size,
          mimetype: file.type,
        };
        const data = await utils.diary.createPresignedPostUrl.fetch(
          {
            diaryId,
            entryId,
            imageMetadata: metadata,
          },
          { staleTime: 0 },
        );

        const formData = new FormData();
        for (const [key, value] of Object.entries(data.fields)) {
          formData.set(key, value);
        }
        formData.set("file", file);

        setValue(`posts.${index}.imageMetadata`, metadata, {
          shouldValidate: true,
        });
        setImgUploadStatuses((prev) => {
          return { ...prev, [id]: { type: "loading" } };
        });
        imageKeyToIdRef.current.set(data.key, id);

        try {
          const res = await fetch(data.url, {
            body: formData,
            method: "post",
          });
          if (!res.ok) {
            throw new Error("Unable to upload image");
          }
          // increment ref which will start poll
        } catch (_) {
          // unable to upload
          setImgUploadStatuses((prev) => {
            return { ...prev, [id]: { type: "error" } };
          });
        }
      })();
    }
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((field) => field.id == active.id);
      const newIndex = fields.findIndex((field) => field.id == over.id);
      move(oldIndex, newIndex);
    }
  }

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    const errors = data.posts.some((post) => {
      return (
        imgUploadStatuses[post.id] === undefined ||
        imgUploadStatuses[post.id]?.type !== "uploaded"
      );
    });
    if (errors) {
      toast({
        title: "One or more images have errors",
        variant: "destructive",
      });
      return;
    }
    mutate({
      entryId,
      posts: data.posts.map((post) => {
        const status = imgUploadStatuses[post.id] as {
          type: "uploaded";
          key: string;
        };
        return {
          id: post.id,
          key: status.key,
          title: post.title,
          description: post.description,
        };
      }),
    });
  };

  return (
    <FormProvider {...formMethods}>
      <form
        className="grid max-w-lg grid-cols-[1fr_auto] gap-y-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields}
            strategy={verticalListSortingStrategy}
          >
            {fields.map((field, index) => {
              // Invariant: field must exist in upload status if it exists in form
              const uploadStatus = imgUploadStatuses[field.id]!;
              return (
                <SortableItem key={field.id} id={field.id}>
                  <FieldSet>
                    <button
                      type="button"
                      onClick={() => removePost(index, field.id)}
                      className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2"
                    >
                      X
                    </button>
                    <div>
                      <Label htmlFor={`${field.id}-title`}>Title</Label>
                      <Input
                        {...register(`posts.${index}.title`)}
                        id={`${field.id}-title`}
                        type="text"
                        placeholder="Whistler at Night"
                      />
                    </div>
                    <div>
                      <ImageField
                        imageUploadStatus={uploadStatus}
                        fieldId={field.id}
                        fieldIndex={index}
                        handleImageUpload={handleImageUpload}
                        resetImage={resetImage}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`${field.id}-description`}>
                        Description
                      </Label>
                      <Textarea
                        {...register(`posts.${index}.description`)}
                        id={`${field.id}-description`}
                      />
                    </div>
                  </FieldSet>
                </SortableItem>
              );
            })}
          </SortableContext>
        </DndContext>
        <button
          onClick={addPost}
          type="button"
          className="col-start-1 col-end-2 rounded border-2 border-muted"
        >
          +
        </button>
        <Button disabled={uploadingImages} className="col-start-1 col-end-2">
          Save
        </Button>
      </form>
    </FormProvider>
  );
});

function ImageField({
  fieldId,
  fieldIndex,
  imageUploadStatus,
  handleImageUpload,
  resetImage,
}: {
  fieldId: string;
  fieldIndex: number;
  imageUploadStatus: UploadStatus;
  handleImageUpload: HandleImageUploadCallabck;
  resetImage: (id: string, key?: string) => void;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<FormValues>();
  const deleteImageMutation = api.diary.deleteImage.useMutation();

  function handleDeleteImage(key: string) {
    deleteImageMutation.mutate(
      { key },
      {
        onSuccess() {
          resetImage(fieldId, key);
        },
      },
    );
  }

  if (imageUploadStatus.type === "empty") {
    return (
      <ImageUpload id={fieldId} onChange={handleImageUpload} index={fieldIndex}>
        {({ handleDragOver, handleDrop, handleFileChange }) => {
          register(`posts.${fieldIndex}.imageMetadata`);
          const error = errors.posts?.[fieldIndex]?.imageMetadata;
          const hasError = !!error?.size?.message || !!error?.mimetype?.message;
          return (
            <Label htmlFor={`${fieldId}-image`}>
              <Dropzone handleDragOver={handleDragOver} handleDrop={handleDrop}>
                <DropzoneContent>
                  <ImgLogo />
                  <p className="leading-4">
                    Click to upload image or drag and drop
                  </p>
                  <p className="text-sm">Max file size 9mb</p>
                  <input
                    id={`${fieldId}-image`}
                    type="file"
                    accept="image/*"
                    className={cn(
                      hasError && "border-red-300",
                      "sr-only min-w-0",
                    )}
                    onChange={handleFileChange}
                    multiple={false}
                  />
                </DropzoneContent>
                {hasError && (
                  <div className="bg-red-300 p-2">
                    {error.size?.message && <p>{error.size.message}</p>}
                    {error.mimetype?.message && <p>{error.mimetype.message}</p>}
                  </div>
                )}
              </Dropzone>
            </Label>
          );
        }}
      </ImageUpload>
    );
  }

  if (imageUploadStatus.type === "loading") {
    return (
      <div className="aspect-square max-w-[250px]">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (imageUploadStatus.type === "error") {
    return (
      <div className="space-y-2 p-2">
        <p>There was an error uploading your image.</p>
        <Button
          type="button"
          onClick={() => resetImage(fieldId, imageUploadStatus.key)}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="relative aspect-square max-w-[250px]">
      <button
        type="button"
        className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2"
        onClick={() => handleDeleteImage(imageUploadStatus.key)}
      >
        X
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="h-full w-full object-cover"
        src={imageUploadStatus.url}
        alt=""
      />
    </div>
  );
}

function FieldSet({ children }: { children: React.ReactNode }) {
  return (
    <fieldset className="relative grid gap-2 bg-gray-100 [grid-auto-rows:auto_250px_auto]">
      {children}
    </fieldset>
  );
}

function Dropzone({
  handleDrop,
  handleDragOver,
  children,
}: {
  handleDrop: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="grid items-center gap-1.5"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {children}
    </div>
  );
}

function DropzoneContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid aspect-square w-full max-w-[250px] content-center justify-center gap-2 rounded border-2 border-dashed border-black p-8 text-center [grid-auto-rows:max-content]">
      {children}
    </div>
  );
}

function ImageUpload({
  onChange,
  index,
  id,
  children,
}: {
  onChange: (index: number, id: string, file: File | null) => void;
  index: number;
  id: string;
  children: ({
    handleDrop,
    handleDragOver,
    handleFileChange,
  }: {
    handleDrop: (e: React.DragEvent) => void;
    handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  }) => React.ReactNode;
}) {
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files === null) {
      onChange(index, id, null);
      return;
    }

    const file = files[0];
    if (file === undefined) {
      onChange(index, id, null);
      return;
    }

    onChange(index, id, file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();

    const files = e.dataTransfer.items;
    if (!files) {
      return;
    }

    const file = files[0]?.getAsFile();
    if (!file?.type.includes("image/")) {
      return;
    }

    onChange(index, id, file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  return children({ handleDragOver, handleDrop, handleFileChange });
}

function ImgLogo() {
  return (
    <svg
      className="mx-auto h-12 w-12 text-gray-400"
      stroke="currentColor"
      fill="none"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <path
        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
