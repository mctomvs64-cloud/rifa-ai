import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = "mctomvs64@gmail.com";
  const newPassword = "99083160";
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await db.user.updateMany({
    where: {
      OR: [
        { email },
        { name: { contains: "lucas", mode: "insensitive" } }
      ]
    },
    data: {
      name: "Tom v.s",
      role: "ADMIN",
      status: "ACTIVE"
    }
  });

  await db.user.upsert({
    where: { email },
    update: {
      name: "Tom v.s",
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE"
    },
    create: {
      email,
      name: "Tom v.s",
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE"
    }
  });

  console.log("Admin password reset successful!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
