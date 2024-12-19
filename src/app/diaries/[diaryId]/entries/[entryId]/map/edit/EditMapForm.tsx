"use client";

import { Button } from "~/app/_components/ui/button";
import { Input } from "~/app/_components/ui/input";
import { Label } from "~/app/_components/ui/label";
import { Textarea } from "~/app/_components/ui/textarea";
import {
  SubmitHandler,
  useFieldArray,
  useForm,
  FormProvider,
  useFormContext,
} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChangeEvent } from "react";
import { cn } from "~/app/_utils/cx";

const formSchema = z.object({
  posts: z
    .object({
      title: z.string(),
      image: z.object({
        name: z.string(),
        size: z.number().max(8920, { message: "Max image size is 8.9MB" }),
        mimetype: z.string().min(1, { message: "Image Required" }),
      }),
      description: z.string(),
    })
    .array(),
});

type FormValues = z.infer<typeof formSchema>;
export function EditMapForm() {
  const formMethods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      posts: [
        {
          title: "",
          image: {
            name: "",
            size: 0,
            mimetype: "",
          },
          description: "",
        },
      ],
    },
  });
  const {
    control,
    register,
    setValue,
    resetField,
    handleSubmit,
    formState: { errors },
  } = formMethods;
  const { fields, append, remove, swap } = useFieldArray({
    control,
    name: "posts",
  });

  function addPost() {
    append({
      title: "",
      description: "",
      image: {
        mimetype: "",
        size: 0,
        name: "",
      },
    });
  }
  function removePost(index: number) {
    remove(index);
  }

  function handleImageUpload(index: number, payload: ImagePayload | null) {
    console.log({ payload });
    if (payload) {
      setValue(`posts.${index}.image`, payload, { shouldValidate: true });
      return;
    }
    resetField(`posts.${index}`);
  }

  const onSubmit: SubmitHandler<FormValues> = (e) => {};

  return (
    <FormProvider {...formMethods}>
      <form className="grid max-w-md gap-4" onSubmit={handleSubmit(onSubmit)}>
        {fields.map((field, index) => {
          const fieldErrors = errors?.posts?.[index];
          console.log(fieldErrors);
          return (
            <fieldset
              key={field.id}
              className="relative grid gap-2 bg-gray-100"
            >
              <button
                onClick={() => remove(index)}
                className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2"
              >
                X
              </button>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  {...register(`posts.${index}.title`)}
                  id="title"
                  type="text"
                  placeholder="Whistler at Night"
                />
              </div>
              <ImageUpload onChange={handleImageUpload} index={index} />
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  {...register(`posts.${index}.description`)}
                  id="description"
                />
              </div>
            </fieldset>
          );
        })}
        <button
          onClick={addPost}
          type="button"
          className="rounded border-2 border-muted"
        >
          +
        </button>
        <Button>Save</Button>
      </form>
    </FormProvider>
  );
}

type ImagePayload = {
  name: string;
  size: number;
  mimetype: string;
};

function ImageUpload({
  onChange,
  index,
}: {
  onChange: (index: number, p: ImagePayload | null) => void;
  index: number;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<FormValues>();
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files === null) {
      onChange(index, null);
      return;
    }

    const file = files[0];
    if (file === undefined) {
      onChange(index, null);
      return;
    }

    onChange(index, {
      name: file.name,
      size: file.size,
      mimetype: file.type,
    });
  }
  register(`posts.${index}.image`);
  const error = errors.posts?.[index]?.image;
  const hasError = !!error?.size?.message || !!error?.mimetype?.message;
  console.log(!!error?.size?.message, !!error?.mimetype?.message);
  return (
    <div className="grid w-full items-center gap-1.5">
      <Label htmlFor="image">Image</Label>
      <Input
        type="file"
        accept="image/*"
        className={cn(hasError && "border-red-300")}
        onChange={handleFileChange}
      />
      {hasError && (
        <div className="bg-red-300 p-2">
          {error.size?.message && <p>{error.size.message}</p>}
          {error.mimetype?.message && <p>{error.mimetype.message}</p>}
        </div>
      )}
    </div>
  );
}
