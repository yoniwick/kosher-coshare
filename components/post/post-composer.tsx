"use client";

import { useEffect, useMemo, useRef, useState, useTransition, startTransition, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import {
  createDraftAction,
  deleteRecipeImageAction,
  generateAiAction,
  publishRecipeAction,
  reorderImagesAction,
  updateDraftAction,
  uploadRecipeImageAction,
} from "@/actions/recipes";
import type { getEditableRecipe } from "@/lib/recipes/editor-load";
import type { IngredientRow, StepRow } from "@/lib/db/schema/recipes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, UploadCloud, ChevronUp, ChevronDown, GripVertical, Trash2, Loader2 } from "lucide-react";
import { blobImageDisplayUrl } from "@/lib/blob/display-url";
import { cn } from "@/lib/utils";

function parseOptionalMinutes(raw: string): number | "" {
  const t = raw.trim();
  if (t === "") return "";
  const n = Number.parseInt(t, 10);
  return Number.isNaN(n) ? "" : n;
}

type InitialData = NonNullable<Awaited<ReturnType<typeof getEditableRecipe>>>;
type ComposerImage = { id: string; imageUrl: string };

type Kosher = "MEAT" | "DAIRY" | "PAREVE";
type Badge = "NUT_FREE" | "PESACH" | "GLUTEN_FREE";

export function PostComposer(props: { initial: InitialData | null; signedIn: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [aiPending, startAiTransition] = useTransition();
  const [publishPending, startPublishTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();
  const [reorderPending, startReorderTransition] = useTransition();

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
  const [servings, setServings] = useState(props.initial?.recipe.servings ?? "");
  const [notes, setNotes] = useState(props.initial?.recipe.notes ?? "");

  const [imageRows, setImageRows] = useState<ComposerImage[]>(() =>
    (props.initial?.images ?? []).map((img) => ({ id: img.id, imageUrl: img.imageUrl }))
  );

  const imageRowsRef = useRef(imageRows);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const pointerSessionRef = useRef<{ pointerId: number; from: number } | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const [dragActiveIndex, setDragActiveIndex] = useState<number | null>(null);
  const [dropHighlightIndex, setDropHighlightIndex] = useState<number | null>(null);

  useEffect(() => {
    imageRowsRef.current = imageRows;
  }, [imageRows]);

  useEffect(() => {
    if (!props.initial) return;
    const data = props.initial;
    startTransition(() => {
      setRecipeId(data.recipe.id);
      setImageRows((data.images ?? []).map((img) => ({ id: img.id, imageUrl: img.imageUrl })));
      setRawInputText(data.recipe.rawInputText ?? "");
      setKosherCategory(data.recipe.kosherCategory);
      setSpecialBadges(data.specialBadges);
      setTagText(data.tags.join(", "));
      setTitle(data.recipe.title ?? "");
      setDescription(data.recipe.description ?? "");
      setIngredients(
        data.recipe.ingredientsNormalized?.length
          ? data.recipe.ingredientsNormalized
          : [{ item: "", amount: "", notes: "" }]
      );
      setSteps(
        data.recipe.stepsNormalized?.length
          ? data.recipe.stepsNormalized
          : [{ stepNumber: 1, instruction: "" }]
      );
      setPrepMinutes(data.recipe.prepMinutes ?? "");
      setCookMinutes(data.recipe.cookMinutes ?? "");
      setServings(data.recipe.servings ?? "");
      setNotes(data.recipe.notes ?? "");
    });
  }, [props.initial]);

  const recipeIdInUrl = searchParams.get("recipeId");
  useEffect(() => {
    if (!recipeId) return;
    if (recipeIdInUrl === recipeId) return;
    router.replace(`${pathname}?recipeId=${encodeURIComponent(recipeId)}`, { scroll: false });
  }, [recipeId, recipeIdInUrl, pathname, router]);

  const tags = useMemo(
    () =>
      tagText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tagText]
  );

  const derivedTotalMinutes = useMemo(() => {
    const p = prepMinutes === "" ? 0 : prepMinutes;
    const c = cookMinutes === "" ? 0 : cookMinutes;
    const sum = p + c;
    return sum > 0 ? sum : null;
  }, [prepMinutes, cookMinutes]);

  const autosaveSnapshotRef = useRef({
    recipeId: null as string | null,
    rawInputText: "",
    kosherCategory: "PAREVE" as Kosher,
    specialBadges: [] as Badge[],
    tags: [] as string[],
    title: "",
    description: "",
    ingredients: [{ item: "", amount: "", notes: "" }] as IngredientRow[],
    steps: [{ stepNumber: 1, instruction: "" }] as StepRow[],
    prepMinutes: "" as number | "",
    cookMinutes: "" as number | "",
    totalMinutes: null as number | null,
    servings: "",
    notes: "",
  });

  useEffect(() => {
    autosaveSnapshotRef.current = {
      recipeId,
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
      totalMinutes: derivedTotalMinutes,
      servings,
      notes,
    };
  }, [
    recipeId,
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
    derivedTotalMinutes,
    servings,
    notes,
  ]);

  useEffect(() => {
    if (!props.signedIn) return;

    async function autosaveTick() {
      const s = autosaveSnapshotRef.current;
      let id = s.recipeId;
      if (!id) {
        const created = await createDraftAction();
        id = created.recipeId;
        setRecipeId(id);
      }

      await updateDraftAction({
        recipeId: id,
        rawInputText: s.rawInputText,
        kosherCategory: s.kosherCategory,
        specialBadges: s.specialBadges,
        tags: s.tags,
        title: s.title,
        description: s.description,
        ingredientsNormalized: s.ingredients,
        stepsNormalized: s.steps,
        prepMinutes: s.prepMinutes === "" ? null : s.prepMinutes,
        cookMinutes: s.cookMinutes === "" ? null : s.cookMinutes,
        totalMinutes: s.totalMinutes,
        servings: s.servings || null,
        notes: s.notes || null,
        status: "DRAFT",
      });
    }

    const intervalMs = 20_000;
    const id = window.setInterval(autosaveTick, intervalMs);
    return () => window.clearInterval(id);
  }, [props.signedIn]);

  async function ensureDraft() {
    if (recipeId) return recipeId;
    const res = await createDraftAction();
    setRecipeId(res.recipeId);
    return res.recipeId;
  }

  function persistImageOrder(next: ComposerImage[]) {
    const id = recipeId;
    if (!id || next.length === 0) return;
    setImageRows(next);
    startReorderTransition(async () => {
      const res = await reorderImagesAction(
        id,
        next.map((r) => r.id)
      );
      if (!res.success) {
        toast.error("Could not save photo order.");
        router.refresh();
      }
    });
  }

  function moveImage(index: number, delta: -1 | 1) {
    const j = index + delta;
    if (j < 0 || j >= imageRows.length) return;
    const next = [...imageRows];
    [next[index], next[j]] = [next[j]!, next[index]!];
    persistImageOrder(next);
  }

  function rowIndexFromClientY(clientY: number): number | null {
    const rows = rowRefs.current;
    if (!rows.length) return null;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < rows.length; i++) {
      const el = rows[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const mid = (r.top + r.bottom) / 2;
      const d = Math.abs(clientY - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  function onGripPointerDown(e: ReactPointerEvent<HTMLButtonElement>, index: number) {
    if (reorderPending || e.button !== 0) return;
    e.preventDefault();
    pointerSessionRef.current = { pointerId: e.pointerId, from: index };
    hoverIndexRef.current = index;
    setDragActiveIndex(index);
    setDropHighlightIndex(index);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onGripPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const session = pointerSessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;
    const h = rowIndexFromClientY(e.clientY);
    if (h == null) return;
    if (h !== hoverIndexRef.current) {
      hoverIndexRef.current = h;
      setDropHighlightIndex(h);
    }
  }

  function commitPointerReorder(e: ReactPointerEvent<HTMLButtonElement>) {
    const session = pointerSessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;
    const from = session.from;
    const to = hoverIndexRef.current ?? from;
    pointerSessionRef.current = null;
    hoverIndexRef.current = null;
    setDragActiveIndex(null);
    setDropHighlightIndex(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (to === from) return;
    const rows = imageRowsRef.current;
    if (from < 0 || to < 0 || from >= rows.length || to >= rows.length) return;
    const next = [...rows];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    persistImageOrder(next);
  }

  function cancelPointerReorder(e: ReactPointerEvent<HTMLButtonElement>) {
    const session = pointerSessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;
    pointerSessionRef.current = null;
    hoverIndexRef.current = null;
    setDragActiveIndex(null);
    setDropHighlightIndex(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }
  }

  function removeImage(imageId: string) {
    const id = recipeId;
    if (!id) return;
    startReorderTransition(async () => {
      const res = await deleteRecipeImageAction(id, imageId);
      if (!res.success) {
        toast.error("Could not remove photo.");
        router.refresh();
        return;
      }
      setImageRows((prev) => prev.filter((r) => r.id !== imageId));
      toast.success("Photo removed");
    });
  }

  function toggleBadge(b: Badge) {
    setSpecialBadges((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  }

  async function onAi() {
    startAiTransition(async () => {
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
    startPublishTransition(async () => {
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
          totalMinutes: derivedTotalMinutes,
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

  async function onSaveDraftNow() {
    startSaveTransition(async () => {
      try {
        const id = await ensureDraft();
        const res = await updateDraftAction({
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
          totalMinutes: derivedTotalMinutes,
          servings: servings || null,
          notes: notes || null,
          status: "DRAFT",
        });
        if (!res.success) {
          toast.error("Could not save draft. Check your entries.");
          return;
        }
        toast.success("Draft saved.");
        router.push("/my-recipes");
      } catch {
        toast.error("Could not save draft.");
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
      if ("image" in up && up.image) {
        setImageRows((prev) => [...prev, { id: up.image.id, imageUrl: up.image.imageUrl }]);
      }
      toast.success("Photo uploaded");
    }
    router.replace(`${pathname}?recipeId=${encodeURIComponent(id)}`, { scroll: false });
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

  const busy = aiPending || publishPending || savePending;

  return (
    <div className="relative space-y-10 pb-24">
      {aiPending ? (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-[color:var(--paper)]/88 px-6 text-center backdrop-blur-md"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="h-12 w-12 shrink-0 animate-spin text-[color:var(--vermilion)]" aria-hidden />
          <div className="max-w-sm space-y-2">
            <p className="font-serif text-xl text-[color:var(--ink)]">Organizing with AI</p>
            <p className="text-sm leading-relaxed text-[color:var(--ink-muted)]">
              Structuring your notes into title, ingredients, and steps. This can take a little while.
            </p>
          </div>
        </div>
      ) : null}

      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--ink-muted)]">
          Compose
        </p>
        <h1 className="font-serif text-4xl leading-tight text-[color:var(--ink)]">Share your kosher creation easy.</h1>
        <p className="text-sm text-[color:var(--ink-muted)]">
          Add photos, jot freely, then organize with AI before publishing
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-[color:var(--line)] bg-white/70 p-4 shadow-soft sm:space-y-4 sm:rounded-3xl sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl">1 · Gather</h2>
            <p className="text-xs text-[color:var(--ink-muted)] sm:text-sm">Photos, notes, and kosher context</p>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Photos</span>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[color:var(--line)] bg-[color:var(--paper)] px-3 py-7 text-xs text-[color:var(--ink-muted)] sm:rounded-3xl sm:px-4 sm:py-10 sm:text-sm">
            <UploadCloud className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
            <span>Add photos</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </label>
        </div>

        {imageRows.length ? (
          <ul className="space-y-1.5 sm:space-y-2" aria-label="Recipe photos">
            {imageRows.map((img, index) => (
              <li
                key={img.id}
                ref={(el) => {
                  rowRefs.current[index] = el;
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl border border-[color:var(--line)] bg-[color:var(--paper)] p-1.5 shadow-sm transition sm:gap-3 sm:rounded-2xl sm:p-2",
                  dragActiveIndex !== null &&
                    index === dropHighlightIndex &&
                    index !== dragActiveIndex &&
                    "ring-2 ring-[color:var(--vermilion)]/40",
                  dragActiveIndex !== null && index === dragActiveIndex && "opacity-90 shadow-md",
                  reorderPending && "pointer-events-none opacity-60"
                )}
              >
                <button
                  type="button"
                  className="flex size-11 shrink-0 touch-none touch-manipulation select-none items-center justify-center rounded-lg border border-[color:var(--line)] bg-white/90 text-[color:var(--ink-muted)] active:bg-[color:var(--paper-2)] sm:size-10"
                  aria-label="Reorder photo"
                  disabled={reorderPending}
                  onPointerDown={(e) => onGripPointerDown(e, index)}
                  onPointerMove={onGripPointerMove}
                  onPointerUp={commitPointerReorder}
                  onPointerCancel={cancelPointerReorder}
                >
                  <GripVertical className="h-5 w-5 sm:h-5 sm:w-5" aria-hidden />
                </button>
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[color:var(--paper-2)] sm:h-24 sm:w-24 sm:rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={blobImageDisplayUrl(img.imageUrl)}
                    alt=""
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-lg sm:h-8 sm:w-8"
                    disabled={index === 0 || reorderPending}
                    aria-label="Move earlier"
                    onClick={() => moveImage(index, -1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-lg sm:h-8 sm:w-8"
                    disabled={index >= imageRows.length - 1 || reorderPending}
                    aria-label="Move later"
                    onClick={() => moveImage(index, 1)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-lg text-[color:var(--vermilion)] hover:bg-[color:var(--vermilion-soft)] sm:h-8 sm:w-8"
                    disabled={reorderPending}
                    aria-label="Remove photo"
                    onClick={() => removeImage(img.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
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

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="vermilion"
            className="rounded-2xl"
            disabled={busy}
            onClick={() => onAi()}
          >
            <Sparkles className="h-5 w-5" />
            Organize with AI
          </Button>
          <Button type="button" variant="outline" className="rounded-2xl" disabled={busy} onClick={() => onSaveDraftNow()}>
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

        <label className="block space-y-2">
          <span className="text-sm font-medium">Tags</span>
          <Input
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            placeholder="Comma-separated — Organize with AI suggests tags from your notes"
          />
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
              onChange={(e) => setPrepMinutes(parseOptionalMinutes(e.target.value))}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Cook (min)
            <Input
              inputMode="numeric"
              value={cookMinutes}
              onChange={(e) => setCookMinutes(parseOptionalMinutes(e.target.value))}
            />
          </label>
          <div className="space-y-2 text-sm font-medium">
            <span>Total (min)</span>
            <div
              className="flex min-h-12 items-center rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper-2)] px-4 text-base text-[color:var(--ink)]"
              aria-live="polite"
            >
              {derivedTotalMinutes != null ? derivedTotalMinutes : "—"}
            </div>
            <p className="text-xs font-normal text-[color:var(--ink-muted)]">Prep + cook (saved automatically)</p>
          </div>
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
          <Button type="button" variant="vermilion" className="rounded-2xl" disabled={busy} onClick={() => onPublish()}>
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
