const SUPERUSER_EMAIL = "lamalo.studio777@gmail.com";

/** Moderator account: may edit/delete any recipe or comment (server-enforced). */
export function isSuperuserEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPERUSER_EMAIL.toLowerCase();
}

export function isOwnerOrSuperuser(ownerId: string, userId: string, email: string | null | undefined): boolean {
  return ownerId === userId || isSuperuserEmail(email);
}
