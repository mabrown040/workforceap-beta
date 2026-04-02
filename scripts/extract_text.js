const fs = require('fs');

function extractText(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Basic regex to strip tags and script styles, mostly leaving text
    // This is very rough but good for an initial look
    let text = content
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return text;
}

console.log("--- app/page.tsx ---");
console.log(extractText('app/page.tsx'));
console.log("\n\n--- app/what-we-do/page.tsx ---");
console.log(extractText('app/what-we-do/page.tsx'));
