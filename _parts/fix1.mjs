import { readFileSync, writeFileSync } from 'node:fs';
const enc = { encoding: 'utf8' };
let f = readFileSync('_parts/handlers.mjs', 'utf8');
f = f.replace('  bankImportSchema,\n', '');
f = f.replace('  reportCreateSchema,\n', '');
f = f.replace("  syncResolveSchema,\n} from '@/lib/server/validation-public';", "  syncResolveSchema,\n  bankImportSchema,\n  reportCreateSchema,\n} from '@/lib/server/validation-public';");
f = f.replace('  duplicateSurvey,\n', '  duplicateSurvey,\n  createSurvey,\n');
writeFileSync('_parts/handlers.mjs', f, enc);
let s2 = readFileSync('_parts/api_s2.txt', 'utf8');
s2 = s2.replace('const updated = await updateSurvey(user.id, id, body, {', 'const updated = await updateSurvey(user.id, id, body as never, {');
writeFileSync('_parts/api_s2.txt', s2, enc);
let s3 = readFileSync('_parts/api_s3.txt', 'utf8');
s3 = s3.replace('const question = await addQuestion(user.id, id, body);', 'const question = await addQuestion(user.id, id, body as never);');
writeFileSync('_parts/api_s3.txt', s3, enc);
let p4 = readFileSync('_parts/api_p4.txt', 'utf8');
const bad = p4.indexOf('return prisma.questionTranslation.upsert({');
if (bad >= 0) {
  const start = p4.lastIndexOf('await prisma.$transaction(', bad);
  const end = p4.indexOf(');', bad);
  p4 = p4.slice(0, start) + `for (let index = 0; index < missing.length; index++) {\n        const question = missing[index];\n        const text = translations[index] ?? question.text;\n        const existing = await prisma.questionTranslation.findFirst({\n          where: { questionId: question.id, language },\n          select: { id: true },\n        });\n        if (existing) {\n          await prisma.questionTranslation.update({ where: { id: existing.id }, data: { text } });\n        } else {\n          await prisma.questionTranslation.create({\n            data: { questionId: question.id, language, text, source: 'AUTO' },\n          });\n        }\n      }` + p4.slice(end + 2);
  writeFileSync('_parts/api_p4.txt', p4, enc);
  console.log('p4 transaction fixed');
} else { console.log('p4 pattern not found'); }
console.log('header patched');
