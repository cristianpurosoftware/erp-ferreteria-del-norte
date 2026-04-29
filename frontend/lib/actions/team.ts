"use server";

import * as usersApi from "@/lib/api/endpoints/users";
import * as rolesApi from "@/lib/api/endpoints/roles";
import * as auditApi from "@/lib/api/endpoints/audit";
import * as permissionsApi from "@/lib/api/endpoints/permissions";
import type { User, Role, AuditEvent, Permission } from "@/lib/types";
import type { PaginatedResult } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

// ─── Users ──────────────────────────────────────────────────

export async function getTeam(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<User>> {
  return usersApi.getAll(params);
}

export async function getTeamQuery(query: string): Promise<PaginatedResult<User>> {
  return usersApi.getAll(new URLSearchParams(query));
}

export async function getUserById(id: string): Promise<User> {
  return usersApi.getById(id);
}

export async function getCurrentUser(): Promise<User> {
  return usersApi.getMe();
}

export async function createUser(data: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
  roleId: string;
  status?: string;
}): Promise<User> {
  const user = await usersApi.create(data);
  revalidatePath("/equipo");
  return user;
}

export async function updateUser(
  id: string,
  data: Record<string, unknown>
): Promise<User> {
  const user = await usersApi.update(id, data);
  revalidatePath("/equipo");
  return user;
}

export async function deleteUser(id: string): Promise<void> {
  await usersApi.remove(id);
  revalidatePath("/equipo");
}

// ─── Roles ──────────────────────────────────────────────────

export async function getRoles(): Promise<PaginatedResult<Role>> {
  return rolesApi.getAll();
}

export async function createRole(data: {
  name: string;
  description?: string | null;
  permissionIds?: string[];
}): Promise<Role> {
  const role = await rolesApi.create(data);
  revalidatePath("/equipo");
  return role;
}

export async function updateRole(
  id: string,
  data: Record<string, unknown>,
): Promise<Role> {
  const role = await rolesApi.update(id, data);
  revalidatePath("/equipo");
  return role;
}

export async function deleteRole(id: string): Promise<void> {
  await rolesApi.remove(id);
  revalidatePath("/equipo");
}

// ─── Permissions ────────────────────────────────────────────

export async function getPermissions(): Promise<Permission[]> {
  return permissionsApi.getAll();
}

// ─── Activity log ───────────────────────────────────────────

export async function getActivityLog(
  params?: Record<string, string | number | undefined>
): Promise<PaginatedResult<AuditEvent>> {
  return auditApi.getAll(params);
}

export async function getActivityLogQuery(query: string): Promise<PaginatedResult<AuditEvent>> {
  return auditApi.getAll(new URLSearchParams(query));
}

export async function getAuditEventById(id: string): Promise<AuditEvent> {
  return auditApi.getById(id);
}

export async function getAuditFacets(): Promise<auditApi.AuditFacets> {
  return auditApi.getFacets();
}
