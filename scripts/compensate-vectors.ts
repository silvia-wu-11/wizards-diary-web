import { parseArgs } from "util";
import { prisma } from "../src/lib/db";
import { vectorizeDiaryEntry } from "../src/lib/embedding/create";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 支持传入参数 --user_id 或者 -u 来传入特定的用户ID。
// 指定user_id时会补偿特定用户的日记；如果不传，则默认扫描全表。
async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      user_id: {
        type: "string",
        short: "u",
      },
    },
  });

  const targetUserId = values.user_id;

  console.log("开始执行向量化数据补偿脚本...");
  if (targetUserId) {
    console.log(`目标用户 ID: ${targetUserId}`);
  } else {
    console.log("未指定用户 ID，将扫描所有用户的日记。");
  }

  // 1. 查找所有 vectorized 为 false 的日记
  // 这些日记可能是由于首次创建或更新时，调用大模型 API 失败导致的遗漏
  const unvectorizedEntries = await prisma.diaryEntry.findMany({
    where: {
      vectorized: false,
      ...(targetUserId ? { book: { userId: targetUserId } } : {}),
    },
    select: { id: true, content: true },
  });

  if (unvectorizedEntries.length === 0) {
    console.log("没有需要补偿的日记。");
    return;
  }

  console.log(`找到 ${unvectorizedEntries.length} 篇需要补偿向量化的日记。`);

  let successCount = 0;
  let failCount = 0;

  // 2. 遍历并重新生成向量
  for (const entry of unvectorizedEntries) {
    try {
      console.log(`正在处理日记 [${entry.id}]...`);

      // vectorizeDiaryEntry 内部已经包含了删除旧 Chunk、生成新 Chunk 以及更新 vectorized = true 的逻辑
      await vectorizeDiaryEntry(entry.id, entry.content);

      successCount++;
      console.log(`✅ 日记 [${entry.id}] 向量化补偿成功。`);

      // 稍微停顿，防止触发 API 限流（例如 500ms）
      await sleep(500);
    } catch (error) {
      failCount++;
      console.error(`❌ 日记 [${entry.id}] 向量化补偿失败:`, error);
    }
  }

  console.log("----------------------------------------");
  console.log("数据补偿执行完毕！");
  console.log(`✅ 成功: ${successCount}`);
  console.log(`❌ 失败: ${failCount}`);
}

main()
  .catch((e) => {
    console.error("脚本执行发生致命错误:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
