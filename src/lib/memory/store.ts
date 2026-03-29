/**
 * Core Memory 读取：从 PostgreSQL User.coreMemory 字段读取用户的记忆内核。
 *
 * 返回的 JSON 类型化为 CoreMemory | null；null 表示用户尚未初始化记忆内核
 * （如新注册用户首次保存日记前）。
 *
 * @see spec  openspec/specs/memory-engine/spec.md
 * @see design openspec/changes/memory-engine/design.md §3.3
 */

import { prisma } from "@/lib/db";
import type { CoreMemory } from "@/app/types/core-memory";

/**
 * 获取指定用户的 Core Memory。
 *
 * @param userId  用户 ID
 * @returns CoreMemory JSON（未初始化时返回 null）
 */
export async function getCoreMemory(userId: string): Promise<CoreMemory | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coreMemory: true },
  });

  if (!user?.coreMemory) return null;
  return user.coreMemory as CoreMemory;
}
