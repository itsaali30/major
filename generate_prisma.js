const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('ecommerce_db_zepto_schema - ecommerce_db_zepto_schema.csv (1).csv');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isFirst = true;
  let schema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;

  let userCols = [
    'UserID', 'UserNameFirst', 'UserNameLast', 'DOB', 'Gender', 'Mobile', 'Email', 'Password', 'Role', 'IsActive', 'CreatedAt', 'LastActiveAt', 'ProfileImageUrl', 'IsOnline', 'GoogleID', 'UpdateAt', 'IsApproved'
  ];

  for await (const line of rl) {
    if (isFirst) {
      isFirst = false;
      continue;
    }

    if (!line.trim()) continue;

    const parts = line.split(',');
    if (parts.length < 5) continue;

    const tableName = parts[1].trim();
    if (!tableName) continue;

    schema += `model ${tableName} {\n`;
    
    // Attempt to extract columns: the third column in CSV is a quoted list of column names, OR columns are laid out from 4 onwards.
    // Due to naive split, row 2 might look like: 2,Warehouses,"WarehouseID, Name...
    
    let columnsString = "";
    let cols = [];
    const quoteStart = line.indexOf('"');
    const quoteEnd = line.lastIndexOf('"');
    if (quoteStart > -1 && quoteEnd > -1 && quoteEnd > quoteStart) {
        columnsString = line.substring(quoteStart + 1, quoteEnd);
        cols = columnsString.split(',').map(c => c.trim()).filter(c => c);
    } else {
        // Fallback to columns from index 4 onwards
        for(let i = 4; i < parts.length; i++) {
           const colRaw = parts[i].trim();
           if (colRaw) cols.push(colRaw);
        }
    }

    // specific patch for user table because it has custom logic in the old schema
    if (tableName.toLowerCase() === 'users') {
        cols = userCols;
    }

    let idFound = false;
    let seenCols = new Set();
    for (let cName of cols) {
        if(!cName) continue;
        cName = cName.replace(/ /g, '');
        if (seenCols.has(cName.toLowerCase())) continue;
        seenCols.add(cName.toLowerCase());

        let cType = 'String?';
        let annotations = '';

        if (cName.toLowerCase().endsWith('id')) {
            cType = 'Int';
            if (!idFound && (cName.toLowerCase() === tableName.toLowerCase() + 'id' || 
                             cName.toLowerCase() === tableName.substring(0, tableName.length-1).toLowerCase() + 'id' || 
                             cName.toLowerCase() === 'id' || 
                             cName === cols[0])) {
                annotations = ' @id @default(autoincrement())';
                idFound = true;
            } else if (!idFound && cName === cols[0]) {
                 annotations = ' @id @default(autoincrement())';
                 idFound = true;
            }
        }
        else if (cName.toLowerCase().includes('lat') || cName.toLowerCase().includes('long') || 
                 cName.toLowerCase().includes('price') || cName.toLowerCase().includes('amount') || 
                 cName.toLowerCase().includes('tax') || cName.toLowerCase().includes('fee') || 
                 cName.toLowerCase().includes('discount') || cName.toLowerCase().includes('multiplier') || 
                 cName.toLowerCase().includes('rating') || cName.toLowerCase().includes('battery') || 
                 cName.toLowerCase().includes('speed') || cName.toLowerCase().includes('heading') || cName.toLowerCase() === 'value' || cName.toLowerCase() === 'balance' || cName.toLowerCase() === 'weight') {
            cType = 'Float?';
        }
        else if (cName.toLowerCase().includes('date') || cName.toLowerCase() === 'createdat' || cName.toLowerCase() === 'updatedat' || cName.toLowerCase() === 'time' || cName.toLowerCase() === 'timestamp' || cName.toLowerCase().endsWith('at')) {
            cType = 'DateTime?';
            if (cName.toLowerCase() === 'createdat') cType = 'DateTime @default(now())';
            if (cName.toLowerCase() === 'updatedat') cType = 'DateTime @updatedAt';
        }
        else if (cName.toLowerCase().startsWith('is')) {
            cType = 'Boolean @default(false)';
        }
        else if (cName.toLowerCase() === 'qty' || cName.toLowerCase().includes('qty') || cName.toLowerCase().includes('level') || cName.toLowerCase() === 'position') {
            cType = 'Int?';
        }

        // Apply some overrides for User table
        if (tableName.toLowerCase() === 'users') {
          if (cName === 'Email') { cType = 'String'; annotations += ' @unique'; }
          if (cName === 'Mobile') { annotations += ' @unique'; }
          if (cName === 'GoogleID') { annotations += ' @unique'; }
          if (cName === 'UserNameFirst' || cName === 'UserNameLast' || cName === 'Role') {
              cType = 'String';
          }
        }

        schema += `  ${cName} ${cType}${annotations}\n`;
    }

    if (!idFound) {
      if (!seenCols.has('id')) {
          schema += `  id Int @id @default(autoincrement())\n`;
      }
    }
    
    schema += `}\n\n`;
  }
  
  fs.writeFileSync('prisma/schema.prisma', schema);
  console.log('Schema generated!');
}

processLineByLine();
