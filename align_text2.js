const fs = require('fs');

function updateFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
}

const pageReplacements = [
    // Change "No upfront costs" to "No tuition costs" to align with zero-barrier / zero-cost proposition and remove implication that there might be BACKEND costs (like ISAs).
    [
        "No upfront costs for training",
        "No tuition costs for training"
    ],
];

updateFile('app/page.tsx', pageReplacements);
