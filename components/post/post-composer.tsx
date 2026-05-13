"use client";

import { useDebouncedCallback } from "use-debounce";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import {
  createDraftAction,
  generateAiAction,
  publishRecipeAction,
  updateDraftAction,
  uploadRecipeImageAction,
} from "@/actions/recipes";
import type { getEditableRecipe } from "@/lib/recipes/editor-load";
import type { IngredientRow, StepRow } from "@/lib/db/schema/recipes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, UploadCloud } from "lucide-react";

type InitialData = NonNullable<Awaited<ReturnType<typeof getEditableRecipe>>>;

type Kosher = "MEAT" | "DAIRY" | "PAREVE";
type Badge = "NUT_FREE" | "PESACH" | "GLUTEN_FREE";

export function PostComposer(props: { initial: InitialData | null; signedIn: boolean }) {
  const [pending, startTransition] = useTransition();

  const [recipeId, setRecipeId] = useState<string | null>(props.initial?.recipe.id ?? null);

  const [rawInputText, setRawInputText] = useState(props.initial?.recipe.rawInputText ?? "");
  const [kosherCategory, setKosherCategory] = useState<Kosher>(props.initial?.recipe.kosherCategory ?? "PAREVE");
  const [specialBadges, setSpecialBadges] = useState<Badge[]>(props.initial?.specialBadges ?? []);
  const [tagText, setTagText] = useState(() => (props.initial?.tags ?? []).join(", "));

  const [title, setTitle] = useState(props.initial?.recipe.title ?? "");
  const [description, setDescription] = useState(props.initial?.recipe.description ?? "");
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    props.initial?.recipe.ingredientsNormalized?.length
      ? props.initial!.recipe.ingredientsNormalized
      : [{ item: "", amount: "", notes: "" }]
  );
  const [steps, setSteps] = useState<StepRow[]>(
    props.initial?.recipe.stepsNormalized?.length
      ? props.initial!.recipe.stepsNormalized
      : [{ stepNumber: 1, instruction: "" }]
  );

  const [prepMinutes, setPrepMinutes] = useState<number | "">(props.initial?.recipe.prepMinutes ?? "");
  const [cookMinutes, setCookMinutes] = useState<number | "">(props.initial?.recipe.cookMinutes ?? "");
  const [totalMinutes, setTotalMinutes] = useState<number | "">(props.initial?.recipe.totalMinutes ?? "");
  const [servings, setServings] = useState(props.initial?.recipe.servings ?? "");
  const [notes, setNotes] = useState(props.initial?.recipe.notes ?? "");

  const images = props.initial?.images ?? [];

  useEffect(() => {
    if (!props.initial) return;
    setRecipeId(props.initial.recipe.id);
    setRawInputText(props.initial.recipe.rawInputText ?? "");
    setKosherCategory(props.initial.recipe.kosherCategory);
    setSpecialBadges(props.initial.specialBadges);
    setTagText(props.initial.tags.join(", "));
    setTitle(props.initial.recipe.title ?? "");
    setDescription(props.initial.recipe.description ?? "");
    setIngredients(
      props.initial.recipe.ingredientsNormalized?.length
        ? props.initial.recipe.ingredientsNormalized
        : [{ item: "", amount: "", notes: "" }]
    );
    setSteps(
      props.initial.recipe.stepsNormalized?.length
        ? props.initial.recipe.stepsNormalized
        : [{ stepNumber: 1, instruction: "" }]
    );
    setPrepMinutes(props.initial.recipe.prepMinutes ?? "");
    setCookMinutes(props.initial.recipe.cookMinutes ?? "");
    setTotalMinutes(props.initial.recipe.totalMinutes ?? "");
    setServings(props.initial.recipe.servings ?? "");
    setNotes(props.initial.recipe.notes ?? "");
  }, [props.initial]);

  const tags = useMemo(
    () =>
      tagText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tagText]
  );

  const debouncedSave = useDebouncedCallback(async () => {
    if (!props.signedIn) return;

    let id = recipeId;
    if (!id) {
      const created = await createDraftAction();
      id = created.recipeId;
      setRecipeId(id);
    }

    await updateDraftAction({
      recipeId: id,
      rawInputText,
      kosherCategory,
      specialBadges,
      tags,
      title,
      description,
      ingredientsNormalized: ingredients,
      stepsNormalized: steps,
      prepMinutes: prepMinutes === "" ? null : prepMinutes,
      cookMinutes: cookMinutes === "" ? null : cookMinutes,
      totalMinutes: totalMinutes === "" ? null : totalMinutes,
      servings: servings || null,
      notes: notes || null,
      status: "DRAFT",
    });
  }, 850);

  useEffect(() => {
    debouncedSave();
  }, [
    recipeId,
    props.signedIn,
    rawInputText,
    kosherCategory,
    specialBadges,
    tags,
    title,
    description,
    ingredients,
    steps,
    prepMinutes,
    cookMinutes,
    totalMinutes,
    servings,
    notes,
    debouncedSave,
  ]);

  async function ensureDraft() {
    if (recipeId) return recipeId;
    const res = await createDraftAction();
    setRecipeId(res.recipeId);
    return res.recipeId;
  }

  function toggleBadge(b: Badge) {
    setSpecialBadges((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  }

  async function onAi() {
    startTransition(async () => {
      try {
        const id = await ensureDraft();
        const res = await generateAiAction(id);
        if (!res.success) {
          toast.error(res.error ?? "AI did not respond");
          return;
        }
        toast.success("Structured with AI — review below.");
        window.location.reload();
      } catch {
        toast.error("AI generation failed");
      }
    });
  }

  async function onPublish() {
    startTransition(async () => {
      try {
        const id = await ensureDraft();
        const res = await publishRecipeAction({
          recipeId: id,
          title: title.trim() || "Untitled recipe",
          description: description.trim(),
          ingredientsNormalized: ingredients.filter((i) => i.item.trim() && i.amount.trim()),
          stepsNormalized: steps
            .filter((s) => s.instruction.trim())
            .map((s, idx) => ({ ...s, stepNumber: idx + 1 })),
          kosherCategory,
          specialBadges,
          tags,
          prepMinutes: prepMinutes === "" ? null : prepMinutes,
          cookMinutes: cookMinutes === "" ? null : cookMinutes,
          totalMinutes: totalMinutes === "" ? null : totalMinutes,
          servings: servings || null,
          notes: notes || null,
        });

        if (!res.success || !("slug" in res)) {
          toast.error("Could not publish — check required fields.");
          return;
        }

        toast.success("Published!");
        window.location.href = `/recipe/${res.slug}`;
      } catch {
        toast.error("Publish failed");
      }
    });
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const id = await ensureDraft();
    for (const file of Array.from(files)) {
      const compressed = await imageCompression(file, { maxSizeMB: 1.2, maxWidthOrHeight: 2000 });
      const fd = new FormData();
      fd.set("recipeId", id);
      fd.set("file", compressed);
      const up = await uploadRecipeImageAction(fd);
      if (!up.success) {
        toast.error(up.error ?? "Upload failed");
        continue;
      }
      toast.success("Photo uploaded");
      window.location.reload();
    }
  }

  if (!props.signedIn) {
    return (
      <div className="rounded-3xl border border-[color:var(--line)] bg-white/70 p-10 text-center shadow-soft">
        <p className="font-serif text-2xl text-[color:var(--ink)]">Sign in to compose</p>
        <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
          Google sign-in keeps posting fast and secure.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="vermilion" className="rounded-2xl">
            <Link href="/login?callbackUrl=/post">Continue with Google</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-24">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--ink-muted)]">
          Compose
        </p>
        <h1 className="font-serif text-4xl leading-tight text-[color:var(--ink)]">A quiet space to write</h1>
        <p className="text-sm text-[color:var(--ink-muted)]">
          Draft autosaves. Add photos, jot freely, then organize with AI before publishing.
        </p>
      </header>

      <section className="space-y-4 rounded-3xl border border-[color:var(--line)] bg-white/70 p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl">1 · Gather</h2>
            <p className="text-sm text-[color:var(--ink-muted)]">Photos, voice-of-heart notes, and kosher context</p>
          </div>
          {!recipeId ? (
            <Button type="button" variant="vermilion" className="rounded-2xl" onClick={() => ensureDraft()}>
              Start draft
            </Button>
          ) : null}
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Photos</span>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-3xl border border-dashed border-[color:var(--line)] bg-[color:var(--paper)] px-4 py-10 text-sm text-[color:var(--ink-muted)]">
            <UploadCloud className="h-5 w-5" />
            Tap to upload (JPEG/PNG/WebP)
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </label>
        </label>

        {images.length ? (
          <div className="grid grid-cols-3 gap-2">
            {images.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={img.id} src={img.imageUrl} alt="" className="aspect-square rounded-2xl object-cover" />
            ))}
          </div>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium">Freeform notes</span>
          <Textarea value={rawInputText} onChange={(e) => setRawInputText(e.target.value)} />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            Kosher category
            <select
              className="h-12 w-full rounded-2xl border border-[color:var(--line)] bg-white/80 px-3 text-[color:var(--ink)]"
              value={kosherCategory}
              onChange={(e) => setKosherCategory(e.target.value as Kosher)}
            >
              <option value="MEAT">Meat (Fleishig)</option>
              <option value="DAIRY">Dairy (Milchig)</option>
              <option value="PAREVE">Pareve</option>
            </select>
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium">Optional badges</span>
            <div className="flex flex-wrap gap-3 text-sm">
              {(
                [
                  ["NUT_FREE", "Nut‑free"],
                  ["PESACH", "Kosher for Pesach"],
                  ["GLUTEN_FREE", "Gluten‑free"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--paper)] px-3 py-2">
                  <input
                    type="checkbox"
                    checked={specialBadges.includes(key)}
                    onChange={() => toggleBadge(key)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Tags (comma separated)</span>
          <Input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="shabbat, soup, ginger" />
        </label>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="vermilion"
            className="rounded-2xl"
            disabled={pending}
            onClick={() => onAi()}
          >
            <Sparkles className="h-5 w-5" />
            Organize with AI
          </Button>
          <Button type="button" variant="outline" className="rounded-2xl" disabled={pending} onClick={() => ensureDraft()}>
            Save draft now
          </Button>
        </div>
      </section>

      <section className="space-y-5 rounded-3xl border border-[color:var(--line)] bg-white/70 p-6 shadow-soft">
        <div>
          <h2 className="font-serif text-2xl">2 · Shape</h2>
          <p className="text-sm text-[color:var(--ink-muted)]">Edit everything — AI is a starting point, not the truth</p>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Title</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Description</span>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Ingredients</span>
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => setIngredients((prev) => [...prev, { item: "", amount: "", notes: "" }])}
            >
              Add line
            </Button>
          </div>
          <div className="space-y-3">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="grid gap-2 md:grid-cols-3">
                <Input
                  placeholder="Amount"
                  value={ing.amount}
                  onChange={(e) => {
                    const next = [...ingredients];
                    next[idx] = { ...ing, amount: e.target.value };
                    setIngredients(next);
                  }}
                />
                <Input
                  placeholder="Ingredient"
                  value={ing.item}
                  onChange={(e) => {
                    const next = [...ingredients];
                    next[idx] = { ...ing, item: e.target.value };
                    setIngredients(next);
                  }}
                />
                <Input
                  placeholder="Notes"
                  value={ing.notes ?? ""}
                  onChange={(e) => {
                    const next = [...ingredients];
                    next[idx] = { ...ing, notes: e.target.value };
                    setIngredients(next);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Steps</span>
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() =>
                setSteps((prev) => [...prev, { stepNumber: prev.length + 1, instruction: "" }])
              }
            >
              Add step
            </Button>
          </div>
          <div className="space-y-3">
            {steps.map((s, idx) => (
              <label key={idx} className="block space-y-2">
                <span className="text-xs font-semibold text-[color:var(--ink-muted)]">Step {idx + 1}</span>
                <Textarea
                  value={s.instruction}
                  onChange={(e) => {
                    const next = [...steps];
                    next[idx] = { ...s, instruction: e.target.value, stepNumber: idx + 1 };
                    setSteps(next);
                  }}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm font-medium">
            Prep (min)
            <Input
              inputMode="numeric"
              value={prepMinutes}
              onChange={(e) =>
                setPrepMinutes(e.target.value === "" ? "" : Number.parseInt(e.target.value, 10))
              }
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Cook (min)
            <Input
              inputMode="numeric"
              value={cookMinutes}
              onChange={(e) =>
                setCookMinutes(e.target.value === "" ? "" : Number.parseInt(e.target.value, 10))
              }
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Total (min)
            <Input
              inputMode="numeric"
              value={totalMinutes}
              onChange={(e) =>
                setTotalMinutes(e.target.value === "" ? "" : Number.parseInt(e.target.value, 10))
              }
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Servings</span>
          <Input value={servings} onChange={(e) => setServings(e.target.value)} placeholder='e.g. "6 bowls"' />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Notes</span>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="button" variant="vermilion" className="rounded-2xl" disabled={pending} onClick={() => onPublish()}>
            Publish
          </Button>
        </div>
        <p className="text-xs text-[color:var(--ink-muted)]">
          Publishing requires a kosher category, structured ingredients, and steps. You can still refine after publishing from
          this page.
        </p>
      </section>
    </div>
  );
}
