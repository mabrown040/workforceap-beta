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
    // 1. Funding message in app/page.tsx
    [
        "Our program is funded through partnerships and successful placements — building toward national scale.",
        "Our program is funded through employer partnerships and grants — building toward national scale."
    ],
];

const whatWeDoReplacements = [
    // 2. Tech partners in app/what-we-do/page.tsx
    [
        "Training programs shaped with employer input — Google, IBM, AWS, CompTIA — so credentials map to real hiring needs.",
        "Training programs shaped with employer input — Google, IBM, AWS, Microsoft, CompTIA — so credentials map to real hiring needs."
    ],
    // 3. Tech partners in mobile view of app/what-we-do/page.tsx
    [
        "{['Google', 'IBM', 'AWS', 'CompTIA', 'Coursera'].map((p) => (",
        "{['Google', 'IBM', 'AWS', 'Microsoft', 'CompTIA', 'Coursera'].map((p) => ("
    ]
];

updateFile('app/page.tsx', pageReplacements);
updateFile('app/what-we-do/page.tsx', whatWeDoReplacements);
