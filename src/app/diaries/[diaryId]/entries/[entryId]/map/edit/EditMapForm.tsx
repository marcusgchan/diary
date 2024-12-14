"use client";

import { Button } from "~/app/_components/ui/button";
import { Input } from "~/app/_components/ui/input";
import { Label } from "~/app/_components/ui/label";
import { Textarea } from "~/app/_components/ui/textarea";
import { SubmitHandler, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChangeEvent, ChangeEventHandler } from "react";

const formSchema = z.object({
  posts: z
    .object({
      title: z.string(),
      image: z.object({
        name: z.string().min(1),
        size: z.number().min(1),
        type: z.string().min(1),
      }),
      description: z.string(),
    })
    .array(),
});

type FormValues = z.infer<typeof formSchema>;
export function EditMapForm() {
  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      posts: [
        {
          title: "",
          image: {
            name: "",
            size: 0,
            type: "",
          },
          description: "",
        },
      ],
    },
  });
  const { fields, append, remove, swap } = useFieldArray({
    control,
    name: "posts",
  });

  function addPost() {
    append({
      title: "",
      description: "",
      image: {
        type: "",
        size: 0,
        name: "",
      },
    });
  }
  register(`posts.0.image`);

  function handleImageUpload(payload: ImagePayload) {
    setValue("posts.0.image", payload);
  }

  const onSubmit: SubmitHandler<FormValues> = (e) => {};

  return (
    <form className="grid max-w-md gap-4" onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field, index) => {
        const fieldErrors = errors?.posts?.[index];
        console.log(fieldErrors);
        return (
          <fieldset key={field.id} className="grid gap-2">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                {...register(`posts.${index}.title`)}
                id="title"
                type="text"
                placeholder="Whistler at Night"
              />
            </div>
            <ImageUpload onChange={handleImageUpload} />
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
  );
}

type ImagePayload = {
  name: string;
  size: number;
  type: string;
};

function ImageUpload({ onChange }: { onChange: (p: ImagePayload) => void }) {
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files === null) {
      return;
    }

    const file = files[0];
    if (file === undefined) {
      return;
    }

    onChange({
      name: file.name,
      size: file.size,
      type: file.type,
    });
  }
  return (
    <div className="grid w-full items-center gap-1.5">
      <Label htmlFor="image">Image</Label>
      <Input type="file" accept="image/*" onChange={handleFileChange} />
    </div>
  );
}
