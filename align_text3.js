const fs = require('fs');

function updateFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
}

const whatWeDoReplacements = [
    // Add 150-day post-placement support mention to the 4th step in the mobile view of what-we-do
    [
        "{ step: '04', title: 'Placement', desc: 'Direct pipeline to hiring partners and long-term career support.' },",
        "{ step: '04', title: 'Placement', desc: 'Direct pipeline to hiring partners with 150-day post-placement support.' },"
    ],
];

updateFile('app/what-we-do/page.tsx', whatWeDoReplacements);
