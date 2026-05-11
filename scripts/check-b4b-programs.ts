import { listPrograms } from '@/lib/coursera/b4bClient';

async function main() {
  const allPrograms = [];
  let start = 0;
  const limit = 100;
  
  while (true) {
    const page = await listPrograms({ excludeContent: true, start, limit });
    allPrograms.push(...page.elements);
    console.error(`Fetched ${page.elements.length} programs (total so far: ${allPrograms.length})`);
    
    if (!page.paging.next || page.elements.length < limit) break;
    start = page.paging.next;
  }
  
  console.log(JSON.stringify({
    count: allPrograms.length,
    programs: allPrograms.map(p => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      state: p.state,
      contentCount: p.contentCount,
    }))
  }, null, 2));
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
