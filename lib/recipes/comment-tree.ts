export type RecipeCommentNode = {
  id: string;
  body: string;
  createdAt: Date;
  authorId: string;
  parentId: string | null;
  authorName: string | null;
  authorImage: string | null;
  authorUsername: string | null;
  replies: RecipeCommentNode[];
};

export type RecipeCommentRow = Omit<RecipeCommentNode, "replies">;

function sortByCreatedAt(a: RecipeCommentNode, b: RecipeCommentNode) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

/** Build a nested tree from flat rows (parent before child order is not required). */
export function buildCommentTree(rows: RecipeCommentRow[]): RecipeCommentNode[] {
  const byId = new Map<string, RecipeCommentNode>();
  for (const r of rows) {
    byId.set(r.id, { ...r, replies: [] });
  }

  const roots: RecipeCommentNode[] = [];
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.parentId && byId.has(r.parentId)) {
      byId.get(r.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  function sortDeep(nodes: RecipeCommentNode[]) {
    nodes.sort(sortByCreatedAt);
    for (const n of nodes) sortDeep(n.replies);
  }
  sortDeep(roots);
  return roots;
}
