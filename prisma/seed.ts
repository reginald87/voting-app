import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Admin
  const adminEmail = process.env.ADMIN_EMAIL || "admin@bmu-sug.edu.ng";
  const adminPassword = process.env.ADMIN_PASSWORD || "bmu-sug-2025";
  const adminName = process.env.ADMIN_NAME || "SUG Electoral Commission";
  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.admin.create({
      data: {
        email: adminEmail,
        name: adminName,
        password: await bcrypt.hash(adminPassword, 10),
      },
    });
    console.log(`Created admin: ${adminEmail} / ${adminPassword}`);
  }

  // Positions + aspirants
  const data: { title: string; description: string; aspirants: string[] }[] = [
    {
      title: "President",
      description: "Chief executive of the Student Union Government.",
      aspirants: ["Amadi", "Ebi", "Tari"],
    },
    {
      title: "Vice President",
      description: "Deputy to the President.",
      aspirants: ["Nengi", "Owie"],
    },
    {
      title: "General Secretary",
      description: "Keeps records and minutes of the union.",
      aspirants: ["Bina", "Keme"],
    },
    {
      title: "Financial Secretary",
      description: "Manages the union's financial records.",
      aspirants: ["Timi", "Ada"],
    },
    {
      title: "Public Relations Officer",
      description: "Handles communication and publicity.",
      aspirants: ["Sara", "Godsway"],
    },
    {
      title: "Welfare Secretary",
      description: "Oversees the welfare of students.",
      aspirants: ["Miebaka", "Eunice", "Zito"],
    },
  ];

  const depts = [
    "Medicine and Surgery (MBBS)",
    "Nursing Science",
    "Medical Laboratory Science",
    "Pharmacy",
    "Public Health",
    "Physiotherapy",
  ];
  const levels = ["200 Level", "300 Level", "400 Level", "500 Level"];

  const manifestos = [
    "I will prioritise transparent leadership, timely disbursement of funds, and a student-first welfare agenda that listens before it acts.",
    "My administration will bridge the gap between management and students, ensuring every voice counts and no student is left behind.",
    "I plan to digitise union processes, improve hostel conditions, and create a responsive grievance system for all departments.",
  ];

  const positions = [];
  for (const p of data) {
    const pos = await prisma.position.upsert({
      where: { title: p.title },
      update: { description: p.description },
      create: { title: p.title, description: p.description },
    });
    positions.push(pos);
    for (let i = 0; i < p.aspirants.length; i++) {
      const first = p.aspirants[i];
      const last = "Candidate";
      const existing = await prisma.aspirant.findFirst({
        where: { positionId: pos.id, firstName: first, lastName: last },
      });
      if (!existing) {
        await prisma.aspirant.create({
          data: {
            positionId: pos.id,
            firstName: first,
            lastName: last,
            department: depts[(i + positions.length) % depts.length],
            level: levels[i % levels.length],
            manifesto: manifestos[i % manifestos.length],
          },
        });
      }
    }
    console.log(`Seeded position: ${p.title}`);
  }

  // Sample voters (some accredited with votes)
  const sampleVoters = [
    { mat: "BMU/2021/001", fn: "Ibi", ln: "Ere", acc: true },
    { mat: "BMU/2021/002", fn: "Furo", ln: "Somitse", acc: true },
    { mat: "BMU/2022/010", fn: "Tare", ln: "Ogolo", acc: true },
    { mat: "BMU/2020/045", fn: "Blessing", ln: "Kio", acc: true },
    { mat: "BMU/2023/099", fn: "Promise", ln: "Loolo", acc: false },
  ];

  let voteCount = 0;
  for (const sv of sampleVoters) {
    const v = await prisma.voter.upsert({
      where: { matNumber: sv.mat },
      update: { accredited: sv.acc },
      create: {
        matNumber: sv.mat,
        email: `${sv.mat.toLowerCase().replace(/\//g, "")}@student.bmu.edu.ng`,
        firstName: sv.fn,
        lastName: sv.ln,
        department: depts[voteCount % depts.length],
        level: levels[voteCount % levels.length],
        sugReceipt: `SUG-2025-${100 + voteCount}`,
        accredited: sv.acc,
      },
    });
    if (sv.acc) {
      for (const pos of positions) {
        const aspirants = await prisma.aspirant.findMany({ where: { positionId: pos.id } });
        if (aspirants.length === 0) continue;
        const pick = aspirants[voteCount % aspirants.length];
        await prisma.vote.upsert({
          where: { voterId_positionId: { voterId: v.id, positionId: pos.id } },
          update: { aspirantId: pick.id },
          create: { voterId: v.id, positionId: pos.id, aspirantId: pick.id },
        });
        voteCount++;
      }
    }
  }
  console.log(`Seeded ${sampleVoters.length} sample voters with votes.`);

  // Executives
  const execs = [
    { name: "Prof. F. O. Abam", position: "President", dept: "Medicine and Surgery (MBBS)", level: "600 Level", year: "2024/2025" },
    { name: "Miss G. S. Diri", position: "Vice President", dept: "Nursing Science", level: "500 Level", year: "2024/2025" },
    { name: "Mr. K. A. Tobi", position: "General Secretary", dept: "Pharmacy", level: "400 Level", year: "2024/2025" },
    { name: "Miss A. N. Bube", position: "Financial Secretary", dept: "Medical Laboratory Science", level: "400 Level", year: "2024/2025" },
    { name: "Mr. E. W. Porbeni", position: "Public Relations Officer", dept: "Public Health", level: "300 Level", year: "2024/2025" },
    { name: "Miss T. O. Ebi", position: "Welfare Secretary", dept: "Physiotherapy", level: "300 Level", year: "2024/2025" },
  ];
  for (const e of execs) {
    const exists = await prisma.executive.findFirst({
      where: { name: e.name, position: e.position },
    });
    if (!exists) {
      await prisma.executive.create({
        data: {
          name: e.name,
          position: e.position,
          department: e.dept,
          level: e.level,
          year: e.year,
        },
      });
    }
  }
  console.log(`Seeded ${execs.length} executives.`);

  // Voting settings: open for 7 days from now
  const start = new Date();
  const end = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await prisma.setting.upsert({
    where: { id: 1 },
    update: { votingOpen: true, votingStart: start, votingEnd: end },
    create: { id: 1, votingOpen: true, votingStart: start, votingEnd: end },
  });
  console.log("Voting window set to OPEN for 7 days.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
